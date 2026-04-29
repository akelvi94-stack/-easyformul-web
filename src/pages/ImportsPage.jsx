import { useState } from "react";
import toast from "react-hot-toast";
import { Download, Upload } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { importReferentialWorkbook, exportReferentialTemplate } from "../services/importService";

export function ImportsPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleExport() {
    try {
      await exportReferentialTemplate();
      toast.success("Modele Excel genere.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const importResult = await importReferentialWorkbook(file);
      setResult(importResult);
      toast.success("Import termine.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Imports Excel"
        description="Generation du modele et import en masse des animaux, besoins, ingredients et compositions."
      />

      <div className="content-grid content-grid--two">
        <SectionCard title="Exporter un modele" subtitle="Workbook Excel pret a remplir">
          <p className="muted-paragraph">
            Le fichier comprend les feuilles Animaux, Besoins, ContraintesBesoins,
            Ingredients, CompositionIngredients et References.
          </p>
          <button className="btn btn--primary" type="button" onClick={handleExport}>
            <Download size={16} />
            Generer le modele Excel
          </button>
        </SectionCard>

        <SectionCard title="Importer un fichier" subtitle="Mise a jour du referentiel dans Supabase">
          <label className="upload-zone">
            <Upload size={18} />
            <span>{importing ? "Import en cours..." : "Choisir un fichier .xlsx"}</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} hidden />
          </label>

          {result ? (
            <div className="import-result">
              <h4>Resume</h4>
              <dl>
                <div><dt>Animaux crees</dt><dd>{result.animalsCreated}</dd></div>
                <div><dt>Animaux mis a jour</dt><dd>{result.animalsUpdated}</dd></div>
                <div><dt>Besoins crees</dt><dd>{result.needsCreated}</dd></div>
                <div><dt>Besoins mis a jour</dt><dd>{result.needsUpdated}</dd></div>
                <div><dt>Categories creees</dt><dd>{result.categoriesCreated}</dd></div>
                <div><dt>Ingredients crees</dt><dd>{result.ingredientsCreated}</dd></div>
                <div><dt>Ingredients mis a jour</dt><dd>{result.ingredientsUpdated}</dd></div>
                <div><dt>Prix enregistres</dt><dd>{result.pricesUpserted}</dd></div>
                <div><dt>Contraintes</dt><dd>{result.constraintsUpserted}</dd></div>
                <div><dt>Compositions</dt><dd>{result.compositionsImported}</dd></div>
              </dl>

              {result.errors.length ? (
                <div className="error-box">
                  <strong>Erreurs detectees</strong>
                  <ul>
                    {result.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}
