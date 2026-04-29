export function SectionCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`section-card ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <div className="section-card__header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="section-card__actions">{actions}</div> : null}
        </div>
      )}
      <div className="section-card__body">{children}</div>
    </section>
  );
}
