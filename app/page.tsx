import { Shell } from "@/components/shell";
import { getSourceCatalog } from "@/lib/data-sources";

export default async function HomePage() {
  const catalog = getSourceCatalog();

  return <Shell initialCatalog={catalog} />;
}
