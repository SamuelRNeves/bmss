import Header from "@/componentes/Header";
import KpiCards from "@/componentes/KpiCards";
import NewsList from "@/componentes/NewsList";
import SentimentTrends from "@/componentes/SentimentTrends";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <Header />

      <KpiCards />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <SentimentTrends />
        </div>

        <div className="flex flex-col gap-8">
          <NewsList />
        </div>
      </div>
    </div>
  );
}
