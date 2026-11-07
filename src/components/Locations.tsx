import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { getFeaturedLocations } from "@/data/locations";
import { useIsMobile } from "@/hooks/use-mobile";

const Locations = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const isMobile = useIsMobile();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const featuredLocations = getFeaturedLocations();

  const getCardStyle = (index: number) => {
    const baseRotation = [-4, 0, 4];
    const baseX = [-280, 0, 280];
    return { rotate: baseRotation[index], x: baseX[index] };
  };

  const renderCard = (location: ReturnType<typeof getFeaturedLocations>[number]) => (
    <Link to={`/location/${location.id}`} className="block">
      <div className="relative h-48 overflow-hidden">
        <img src={location.image} alt={location.name} className="w-full h-full object-cover" />
        <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="font-light text-xs">{location.rating}</span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-base font-normal mb-1 text-card-foreground tracking-tight">{location.name}</h3>
        <div className="flex items-center gap-1 text-muted-foreground mb-4 text-xs font-light">
          <MapPin className="h-3 w-3" />
          <span>{location.location}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {location.features.map((feature) => (
            <span key={feature} className="text-[10px] uppercase tracking-wide px-2 py-1 bg-accent text-accent-foreground rounded-sm font-light">{feature}</span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-light text-foreground">${location.price}</span>
            <span className="text-muted-foreground text-xs font-light">/night</span>
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs font-light">
            View Details
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </Link>
  );

  return (
    <section id="locations" className="py-32 lg:py-40 bg-background" ref={ref}>
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-4 block">
            Our Locations
          </span>
          <h2 className="text-2xl md:text-3xl font-light mb-4 text-foreground tracking-tight">
            Featured Spots
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto font-light">
            Handpicked spots where nature's beauty meets sustainable comfort
          </p>
        </motion.div>

        {isMobile ? (
          <div className="flex flex-col gap-6 w-full overflow-hidden">
            {featuredLocations.map((location, index) => (
              <div key={location.id} className="w-full">
                <Card className="overflow-hidden border border-border bg-card shadow-lg w-full">
                  {renderCard(location)}
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative flex justify-center items-center h-[500px]">
            {featuredLocations.map((location, index) => {
              const isHovered = hoveredIndex === index;
              const cardStyle = getCardStyle(index);
              return (
                <motion.div
                  key={location.id}
                  initial={{ opacity: 0, y: 50, ...cardStyle }}
                  animate={isInView ? { opacity: 1, y: isHovered ? -20 : 0, rotate: isHovered ? 0 : cardStyle.rotate, x: cardStyle.x, scale: isHovered ? 1.05 : 1, zIndex: isHovered ? 50 : 10 - Math.abs(index - 1) } : {}}
                  transition={{ duration: 0.4, delay: isInView && !hoveredIndex ? index * 0.15 : 0, ease: "easeOut" }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="absolute w-[320px] cursor-pointer"
                  style={{ zIndex: isHovered ? 50 : 10 - Math.abs(index - 1) }}
                >
                  <Card className={`overflow-hidden border border-border bg-card transition-shadow duration-300 ${isHovered ? 'shadow-2xl' : 'shadow-lg'}`}>
                    {renderCard(location)}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Locations;