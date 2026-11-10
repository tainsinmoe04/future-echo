import { JOURNAL_TEMPLATES, type JournalTemplate } from "@/lib/journal-templates";

export function TemplatePicker({ selected, onSelect }: { selected?: string; onSelect: (id: JournalTemplate) => void }) {
  return <section className="journal-template-picker" aria-label="Journal templates">
    <div className="journal-template-heading"><h3>A little atmosphere</h3><p>Choose a starting point. Your words and photos stay yours.</p></div>
    <div className="journal-template-grid">{JOURNAL_TEMPLATES.map(template => <button type="button" key={template.id} aria-pressed={selected === template.id} onClick={() => onSelect(template.id)}>
      <span className={`journal-template-thumb theme-${template.id}`} aria-hidden="true"><span className="journal-template-ornament" /><span className="journal-template-name">{template.label}</span></span>
      <strong>{template.label}</strong><span>{template.description}</span>
    </button>)}</div>
    <p className="journal-template-caption">Design only · no example memories or AI permissions are added.</p>
  </section>;
}
