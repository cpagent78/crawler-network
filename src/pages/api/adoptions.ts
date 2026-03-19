import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

interface AdoptionData {
  userId: string
  petId: string
  adoptionDate: string
  adoptionType: 'shelter' | 'rescue' | 'stray'
}

const REWARD_POINTS = {
  shelter: 100,
  rescue: 150,
  stray: 200
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, petId, adoptionDate, adoptionType }: AdoptionData = req.body

    if (!userId || !petId || !adoptionDate || !adoptionType) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (!['shelter', 'rescue', 'stray'].includes(adoptionType)) {
      return res.status(400).json({ error: 'Invalid adoption type' })
    }

    // Check if adoption already exists
    const { data: existingAdoption } = await supabase
      .from('adoptions')
      .select('id')
      .eq('user_id', userId)
      .eq('pet_id', petId)
      .single()

    if (existingAdoption) {
      return res.status(400).json({ error: 'Adoption already recorded' })
    }

    // Record adoption
    const { data: adoption, error: adoptionError } = await supabase
      .from('adoptions')
      .insert({
        user_id: userId,
        pet_id: petId,
        adoption_date: adoptionDate,
        adoption_type: adoptionType,
        status: 'completed'
      })
      .select()
      .single()

    if (adoptionError) {
      throw adoptionError
    }

    // Calculate reward points
    const rewardPoints = REWARD_POINTS[adoptionType]

    // Check if user already has rewards record
    const { data: existingReward } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existingReward) {
      // Update existing rewards
      const { error: updateError } = await supabase
        .from('rewards')
        .update({
          total_points: existingReward.total_points + rewardPoints,
          adoption_rewards: existingReward.adoption_rewards + rewardPoints,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        throw updateError
      }
    } else {
      // Create new rewards record
      const { error: insertError } = await supabase
        .from('rewards')
        .insert({
          user_id: userId,
          total_points: rewardPoints,
          adoption_rewards: rewardPoints,
          referral_rewards: 0,
          activity_rewards: 0
        })

      if (insertError) {
        throw insertError
      }
    }

    // Log reward transaction
    const { error: transactionError } = await supabase
      .from('reward_transactions')
      .insert({
        user_id: userId,
        points: rewardPoints,
        type: 'adoption',
        description: `Adoption reward for ${adoptionType} adoption`,
        reference_id: adoption.id
      })

    if (transactionError) {
      throw transactionError
    }

    res.status(200).json({
      message: 'Adoption recorded successfully',
      adoption,
      rewardPoints
    })

  } catch (error) {
    console.error('Error processing adoption:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}