export function CockpitBackLink({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label="Back to cockpit"
    className="hidden min-h-[38px] shrink-0 items-center gap-1.5 px-1 text-xs font-medium text-portal-text transition-colors hover:text-portal-heading focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-accent sm:inline-flex">
    <i className="pi pi-arrow-left text-[10px]" aria-hidden="true" />
    <span>Cockpit</span>
  </button>;
}
