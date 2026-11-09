import { createFileRoute } from '@tanstack/react-router';

// Page des départs : remplie par la tâche T04 de la spec 006.
function DeparturesPlaceholder() {
  return <h1 className="text-3xl">Les départs</h1>;
}

export const Route = createFileRoute('/departs')({ component: DeparturesPlaceholder });
