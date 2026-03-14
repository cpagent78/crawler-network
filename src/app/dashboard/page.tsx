"use client";

import { useEffect, useState } from "react";

interface DashboardData {
  overview: {
    totalSubmissions: number;
    totalAdoptions: number;
    totalRewards: number;
    activeCrawlers: number;
    adoptionRate: string;
  };
  today: {
    submissions: number;
    adoptions: number;
  };
  statusCounts: { status: string; count: number }[];
  crawlerPerformance: {
    crawlerId: string;
    name: string;
    version: string;
    status: string;
    submissionCount: number;
  }[];
  sourceSiteStats: { sourceSite: string; count: number }[];
  serviceStatus: {
    id: string;
    name: string;
    displayName: string;
    dailyLimit: number;
    todayCount: number;
    active: number;
  }[];
  recentAdoptions: {
    submissionId: string;
    service: string;
    pageUrl: string | null;
    adoptedAt: string;
    title: string | null;
    sourceSite: string | null;
  }[];
  recentRewards: {
    crawlerId: string;
    type: string;
    service: string;
    amount: number;
    reason: string | null;
    createdAt: string;
  }[];
  generatedAt: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard", {
        headers: { "x-api-key": apiKey },
      });
      if (!res.ok) {
        setError(`Error: ${res.status}`);
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!apiKey) return;
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // 30초마다 갱신
    return () => clearInterval(interval);
  }, [apiKey]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-2">🕷️ Crawler Network Dashboard</h1>
      <p className="text-gray-400 mb-8">실시간 크롤러 네트워크 모니터링</p>

      {!data && (
        <div className="max-w-md">
          <label className="block text-sm text-gray-400 mb-2">Admin API Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Admin API Key 입력"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            />
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium"
            >
              {loading ? "로딩..." : "연결"}
            </button>
          </div>
          {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
        </div>
      )}

      {data && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card title="총 제출" value={data.overview.totalSubmissions} />
            <Card title="총 채택" value={data.overview.totalAdoptions} />
            <Card title="채택률" value={`${data.overview.adoptionRate}%`} />
            <Card title="총 보상" value={data.overview.totalRewards} />
            <Card title="활성 크롤러" value={data.overview.activeCrawlers} />
          </div>

          {/* Today */}
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
            <Card title="오늘 제출" value={data.today.submissions} color="blue" />
            <Card title="오늘 채택" value={data.today.adoptions} color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* 서비스 상태 */}
            <Section title="📡 서비스 상태">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2">서비스</th>
                    <th className="text-right py-2">오늘/한도</th>
                    <th className="text-right py-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {data.serviceStatus.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800/50">
                      <td className="py-2">{s.displayName}</td>
                      <td className="text-right py-2">
                        {s.todayCount}/{s.dailyLimit}
                      </td>
                      <td className="text-right py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            s.active
                              ? "bg-green-900 text-green-300"
                              : "bg-red-900 text-red-300"
                          }`}
                        >
                          {s.active ? "활성" : "비활성"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.serviceStatus.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500">
                        등록된 서비스 없음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>

            {/* 크롤러 성과 */}
            <Section title="🤖 크롤러별 성과">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2">크롤러</th>
                    <th className="text-right py-2">버전</th>
                    <th className="text-right py-2">제출</th>
                    <th className="text-right py-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {data.crawlerPerformance.map((c) => (
                    <tr key={c.crawlerId} className="border-b border-gray-800/50">
                      <td className="py-2">{c.name}</td>
                      <td className="text-right py-2 text-gray-400">{c.version}</td>
                      <td className="text-right py-2">{c.submissionCount}</td>
                      <td className="text-right py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            c.status === "active"
                              ? "bg-green-900 text-green-300"
                              : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.crawlerPerformance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">
                        등록된 크롤러 없음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* 소스 사이트별 (최근 7일) */}
            <Section title="🌐 소스별 제출 (7일)">
              {data.sourceSiteStats.length > 0 ? (
                <div className="space-y-2">
                  {data.sourceSiteStats.slice(0, 10).map((s) => (
                    <div key={s.sourceSite} className="flex justify-between items-center">
                      <span className="text-sm">{s.sourceSite}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 bg-blue-500 rounded"
                          style={{
                            width: `${Math.min(
                              (s.count / (data.sourceSiteStats[0]?.count || 1)) * 120,
                              120
                            )}px`,
                          }}
                        />
                        <span className="text-sm text-gray-400 w-8 text-right">
                          {s.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">데이터 없음</p>
              )}
            </Section>

            {/* 최근 채택 */}
            <Section title="✅ 최근 채택">
              {data.recentAdoptions.length > 0 ? (
                <div className="space-y-3">
                  {data.recentAdoptions.map((a) => (
                    <div key={a.submissionId} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300 truncate max-w-xs">
                          {a.title ?? "제목 없음"}
                        </span>
                        <span className="text-xs text-gray-500 ml-2 shrink-0">
                          {a.service}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {a.sourceSite} · {new Date(a.adoptedAt).toLocaleString("ko-KR")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">채택 내역 없음</p>
              )}
            </Section>
          </div>

          {/* 최근 보상 */}
          <Section title="🏆 최근 보상">
            {data.recentRewards.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2">유형</th>
                    <th className="text-left py-2">서비스</th>
                    <th className="text-right py-2">보상</th>
                    <th className="text-left py-2">사유</th>
                    <th className="text-right py-2">시각</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRewards.map((r, i) => (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            r.type === "adoption"
                              ? "bg-blue-900 text-blue-300"
                              : "bg-purple-900 text-purple-300"
                          }`}
                        >
                          {r.type === "adoption" ? "채택" : "성과"}
                        </span>
                      </td>
                      <td className="py-2">{r.service}</td>
                      <td className="text-right py-2 font-mono text-green-400">
                        +{r.amount}
                      </td>
                      <td className="py-2 text-gray-400 truncate max-w-xs">
                        {r.reason}
                      </td>
                      <td className="text-right py-2 text-gray-500 text-xs">
                        {new Date(r.createdAt).toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-sm">보상 내역 없음</p>
            )}
          </Section>

          <p className="text-xs text-gray-600 mt-8">
            마지막 갱신: {new Date(data.generatedAt).toLocaleString("ko-KR")} (30초마다 자동 갱신)
          </p>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  color = "default",
}: {
  title: string;
  value: string | number;
  color?: string;
}) {
  const bgColor =
    color === "blue"
      ? "bg-blue-900/30 border-blue-800"
      : color === "green"
      ? "bg-green-900/30 border-green-800"
      : "bg-gray-900 border-gray-800";

  return (
    <div className={`${bgColor} border rounded-lg p-4`}>
      <p className="text-xs text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
