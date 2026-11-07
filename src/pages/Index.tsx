import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Locations from "@/components/Locations";
import Experience from "@/components/Experience";
import Booking from "@/components/Booking";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navigation />
      <Hero />
      <Locations />
      <Experience />
      <Booking />
      <Footer />
    </div>
  );
};

export default Index;
