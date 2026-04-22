import ComparisonGraph from "@/components/ComparisonGraph";

interface GraphPageProps {
  params: Promise<{ username: string }>;
}

export default async function GraphPage({ params }: GraphPageProps) {
  const { username } = await params;
  return <ComparisonGraph username={username} />;
}
