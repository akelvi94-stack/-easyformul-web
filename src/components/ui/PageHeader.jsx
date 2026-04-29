export function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">Module</p>
        <h1>{title}</h1>
        {description ? <p className="page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}
