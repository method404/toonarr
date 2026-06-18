import { AdminShell } from "@/app/_components/admin-shell";
import { SectionCard } from "@/app/_components/section-card";
import { StatusPill } from "@/app/_components/status-pill";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getDashboardSnapshot, getSystemWidgets } from "@/lib/mock-data";

const toneByResult = {
  info: "accent",
  success: "good",
  warning: "warn",
  error: "bad",
} as const;

const toneByAdapterStatus = {
  ready: "good",
  planned: "accent",
  degraded: "warn",
} as const;

export default async function SystemPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const [widgets, snapshot] = await Promise.all([
    getSystemWidgets(locale),
    getDashboardSnapshot(locale),
  ]);

  return (
    <AdminShell
      locale={locale}
      activePath="/system"
      title={dict.systemPage.title}
      description={dict.systemPage.description}
      actions={
        <>
          <button type="button" className="button secondary">
            {dict.common.reloadHealth}
          </button>
          <button type="button" className="button">
            {dict.common.testAdapter}
          </button>
        </>
      }
    >
      <section className="system-grid">
        {widgets.map((widget) => (
          <article key={widget.id} className="card system-tile">
            <p className="eyebrow">{widget.label}</p>
            <strong className="tile-value">{widget.value}</strong>
            <p className="muted">{widget.detail}</p>
            <div className="top-gap">
              <StatusPill tone={toneByResult[widget.status]}>
                {dict.statusLabels[widget.status]}
              </StatusPill>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid secondary-grid">
        <SectionCard
          eyebrow={dict.common.series}
          title={dict.systemPage.adapterStatus}
          description={dict.systemPage.adapterStatusDesc}
        >
          <div className="stack compact-stack">
            {snapshot.adapters.map((adapter) => (
              <article key={adapter.id} className="list-row compact-row">
                <div>
                  <strong>{adapter.name}</strong>
                  <p className="tiny">
                    {adapter.mode} adapter · {adapter.notes}
                  </p>
                </div>
                <StatusPill tone={toneByAdapterStatus[adapter.status]}>
                  {dict.statusLabels[adapter.status]}
                </StatusPill>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow={dict.common.settings}
          title={dict.systemPage.checklist}
          description={dict.systemPage.checklistDesc}
        >
          <ul className="plain-list">
            {dict.systemPage.checklistItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      </section>
    </AdminShell>
  );
}
