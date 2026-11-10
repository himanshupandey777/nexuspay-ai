
import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz } from 'ag-grid-community';

import StatusBadge from './StatusBadge';

const Dashboard = ({ milestones = [], loading, onRefresh }) => {
  const columnDefs = useMemo(() => [
    {
      headerName: 'Title',
      field: 'title',
      sortable: true,
      filter: true,
      flex: 2,
      minWidth: 200,
      cellStyle: {
        fontWeight: '600',
        color: '#1e293b',
      },
    },
    {
      headerName: 'Amount',
      field: 'amount',
      sortable: true,
      flex: 1,
      minWidth: 130,
      valueFormatter: (p) =>
        `$${Number(p.value || 0).toLocaleString()} ${p.data?.currency || 'USD'}`,
    },
    {
      headerName: 'Status',
      field: 'status',
      sortable: true,
      flex: 1,
      minWidth: 120,
      cellRenderer: (p) => <StatusBadge status={p.value} />,
    },
    {
      headerName: 'AI Confidence',
      field: 'aiVerification.confidenceScore',
      sortable: true,
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) =>
        p.value != null ? `${p.value}%` : 'N/A',
      cellStyle: (p) => {
        const score = Number(p.value);

        return {
          fontWeight: '600',
          color: score >= 80
            ? '#059669'
            : score >= 60
              ? '#d97706'
              : '#dc2626',
        };
      },
    },
    {
      headerName: 'Freelancer',
      field: 'freelancerEmail',
      sortable: true,
      filter: true,
      flex: 2,
      minWidth: 200,
    },
  ], []);

  const verifiedCount = milestones.filter(
    (m) => m.status === 'verified' || m.status === 'paid'
  ).length;

  const totalPaid = milestones
    .filter((m) => m.status === 'paid')
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const stats = [
    {
      label: 'Total Milestones',
      value: milestones.length,
      symbol: 'M',
      color: 'bg-indigo-100 text-indigo-700',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Verified / Paid',
      value: verifiedCount,
      symbol: 'V',
      color: 'bg-emerald-100 text-emerald-700',
      valueColor: 'text-emerald-600',
    },
    {
      label: 'Total Paid',
      value: `$${totalPaid.toLocaleString()}`,
      symbol: '$',
      color: 'bg-blue-100 text-blue-700',
      valueColor: 'text-slate-900',
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <p className="text-sm font-medium text-slate-500">
          Loading your milestones...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>

                <p className={`mt-3 text-3xl font-bold tracking-tight ${stat.valueColor}`}>
                  {stat.value}
                </p>
              </div>

              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${stat.color}`}>
                {stat.symbol}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Milestone Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Milestones
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track verification and payment activity
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <span className="text-base">↻</span>
            Refresh
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {milestones.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-600">
                +
              </div>

              <h3 className="text-lg font-semibold text-slate-800">
                No milestones yet
              </h3>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Your submitted milestones will appear here once you start processing payments.
              </p>
            </div>
          ) : (
            <div
              className="w-full overflow-hidden rounded-xl"
              style={{ height: 500 }}
            >
              <AgGridReact
                theme={themeQuartz}
                rowData={milestones}
                columnDefs={columnDefs}
                defaultColDef={{
                  resizable: true,
                  sortable: true,
                }}
                animateRows={true}
                pagination={true}
                paginationPageSize={10}
                rowHeight={47}
                headerHeight={48}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
