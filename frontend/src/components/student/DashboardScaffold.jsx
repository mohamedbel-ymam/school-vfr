// src/components/Student/Dashboards/_parts/DashboardScaffold.jsx
import { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../../components/ui/carousel";

export function StatCard({ title, value }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function DashboardScaffold({ title, images = [], stats = [], shortcuts = [], onBack }) {
  const autoplay = useRef(Autoplay({ delay: 3800, stopOnInteraction: false }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {onBack && <Button variant="outline" onClick={onBack}>Changer de filière</Button>}
      </div>

      {!!images.length && (
        <Carousel plugins={[autoplay.current]} className="w-full max-w-4xl mx-auto">
          <CarouselContent>
            {images.map((src, i) => (
              <CarouselItem key={i}>
                <div className="p-1">
                  <img src={src} alt={`slide-${i+1}`} className="rounded-xl w-full h-64 object-cover" loading="lazy" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => <StatCard key={s.title} title={s.title} value={s.value} />)}
      </div>

      {!!shortcuts.length && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-medium">Raccourcis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {shortcuts.map((sc) => (
              <Button key={sc.label} variant="secondary" onClick={sc.onClick}>
                {sc.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
