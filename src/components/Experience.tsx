import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Leaf, Wifi, Droplets, Sun } from "lucide-react";

const features = [
  {
    icon: Leaf,
    title: "100% Off-Grid",
    description: "Completely sustainable living with solar power and composting systems",
    videoUrl: "https://videos.pexels.com/video-files/4460100/4460100-hd_1920_1080_30fps.mp4",
  },
  {
    icon: Wifi,
    title: "Digital Detox",
    description: "No wifi, no signal - just pure connection with nature and yourself",
    videoUrl: "https://videos.pexels.com/video-files/4280450/4280450-hd_1920_1080_30fps.mp4",
  },
  {
    icon: Droplets,
    title: "Natural Water",
    description: "Fresh spring water and eco-friendly facilities for your comfort",
    videoUrl: "https://videos.pexels.com/video-files/5487781/5487781-hd_1920_1080_30fps.mp4",
  },
  {
    icon: Sun,
    title: "Scenic Views",
    description: "Wake up to breathtaking sunrises in untouched wilderness",
    videoUrl: "https://videos.pexels.com/video-files/4460098/4460098-hd_1920_1080_30fps.mp4",
  },
];

const Experience = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="experience" className="py-32 lg:py-40 bg-secondary/30" ref={ref}>
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-4 block">
            The Experience
          </span>
          <h2 className="text-2xl md:text-3xl font-light mb-4 text-foreground tracking-tight">
            Simplicity Meets Comfort
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto font-light">
            Embrace simplicity without sacrificing comfort
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isHovered = hoveredIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 0, scale: 1 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0 }}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.3 }}
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
                className="relative overflow-hidden bg-white/60 backdrop-blur-md border border-white/80 rounded-lg p-6 group hover:bg-black/50 hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
              >
                {/* Video Background */}
                <video
                  src={feature.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-30 transition-opacity duration-500 z-0"
                />
                
                {/* Content */}
                <div className="relative z-10 flex items-center gap-5">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-white/20 transition-colors duration-300">
                    <Icon className="h-5 w-5 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-normal mb-1 text-foreground group-hover:text-white tracking-tight transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-muted-foreground group-hover:text-white/90 leading-relaxed font-light transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Experience;