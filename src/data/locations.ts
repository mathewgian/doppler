import { WifiOff, Droplets, Flame, Users } from "lucide-react";
import spotForest from "@/assets/spot-forest.jpg";
import spotLake from "@/assets/spot-lake.jpg";
import spotMeadow from "@/assets/spot-meadow.jpg";
import detailForest1 from "@/assets/detail-forest-1.jpg";
import detailForest2 from "@/assets/detail-forest-2.jpg";
import detailLake1 from "@/assets/detail-lake-1.jpg";
import detailLake2 from "@/assets/detail-lake-2.jpg";
import detailMeadow1 from "@/assets/detail-meadow-1.jpg";
import detailMeadow2 from "@/assets/detail-meadow-2.jpg";

export interface Review {
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Location {
  id: string;
  name: string;
  location: string;
  description: string;
  rating: number;
  price: number;
  image: string;
  images: string[];
  features: string[];
  featured: boolean;
  amenities: {
    icon: any;
    label: string;
    description: string;
  }[];
  details: string[];
  reviews: Review[];
}

export const locations: Location[] = [
  {
    id: "forest",
    name: "Forest Haven",
    location: "Pacific Northwest",
    description: "Immerse yourself in the tranquility of old-growth forests. This secluded spot offers the perfect balance of privacy and natural beauty, with towering pines creating a cathedral-like canopy above your campsite.",
    rating: 4.9,
    price: 85,
    image: spotForest,
    images: [detailForest1, detailForest2, detailLake1],
    features: ["Private campsite", "Fire pit", "Solar shower"],
    featured: true,
    amenities: [
      { icon: Flame, label: "Fire Pit", description: "Wood-burning fire pit with seating area" },
      { icon: Droplets, label: "Solar Shower", description: "Eco-friendly outdoor shower" },
      { icon: WifiOff, label: "No WiFi", description: "Complete digital detox experience" },
      { icon: Users, label: "4 Guests Max", description: "Intimate group size" },
    ],
    details: [
      "Tent platform with weatherproof covering",
      "Composting toilet facilities",
      "Fresh spring water access",
      "Wildlife observation opportunities",
      "Hiking trails within 5 minutes",
      "All camping equipment provided",
    ],
    reviews: [
      { author: "Sarah M.", rating: 5, date: "December 2025", comment: "Absolutely magical! The forest sounds at night were so peaceful. We saw deer right outside our tent." },
      { author: "James T.", rating: 5, date: "November 2025", comment: "Perfect getaway from city life. The fire pit was amazing and the solar shower worked great." },
      { author: "Emily R.", rating: 4, date: "October 2025", comment: "Beautiful location, very private. The hiking trails nearby were stunning in autumn." },
      { author: "Michael B.", rating: 5, date: "September 2025", comment: "Best camping experience ever. Everything was well thought out and the hosts were wonderful." },
    ],
  },
  {
    id: "lake",
    name: "Lakeside Retreat",
    location: "Mountain Valley",
    description: "Wake up to pristine lake views and mountain reflections. This waterfront location is perfect for water enthusiasts, offering swimming, kayaking, and fishing in crystal-clear waters surrounded by alpine peaks.",
    rating: 5.0,
    price: 95,
    image: spotLake,
    images: [detailLake1, detailLake2, detailMeadow1],
    features: ["Waterfront", "Kayak included", "Composting toilet"],
    featured: true,
    amenities: [
      { icon: Droplets, label: "Lake Access", description: "Private waterfront with dock" },
      { icon: Flame, label: "Fire Ring", description: "Lakeside fire pit for evening gatherings" },
      { icon: WifiOff, label: "Off-Grid", description: "Solar powered facilities only" },
      { icon: Users, label: "5 Guests Max", description: "Spacious lakeside setup" },
    ],
    details: [
      "Waterfront tent with lake views",
      "Complimentary kayak usage",
      "Fishing equipment available",
      "Outdoor kitchen setup",
      "Swimming access year-round",
      "Mountain biking trails nearby",
    ],
    reviews: [
      { author: "David L.", rating: 5, date: "January 2026", comment: "The lake views are unreal! Kayaking at sunrise was the highlight of our trip." },
      { author: "Anna K.", rating: 5, date: "December 2025", comment: "Perfect romantic getaway. The private dock made us feel like we had the whole lake to ourselves." },
      { author: "Chris P.", rating: 5, date: "November 2025", comment: "Caught some amazing fish and the outdoor kitchen was perfect for cooking them up." },
      { author: "Lisa H.", rating: 5, date: "October 2025", comment: "Exceeded all expectations. The mountain reflections on the lake were breathtaking." },
    ],
  },
  {
    id: "meadow",
    name: "Meadow Vista",
    location: "Alpine Range",
    description: "Experience unobstructed 360-degree mountain views from this elevated meadow campsite. Perfect for stargazing, wildflower photography, and those seeking wide-open spaces and fresh mountain air.",
    rating: 4.8,
    price: 75,
    image: spotMeadow,
    images: [detailMeadow1, detailMeadow2, detailForest1],
    features: ["Panoramic views", "Hiking trails", "Wildlife viewing"],
    featured: true,
    amenities: [
      { icon: Flame, label: "Fire Pit", description: "Stone fire pit with mountain views" },
      { icon: Droplets, label: "Water Station", description: "Filtered mountain spring water" },
      { icon: WifiOff, label: "Remote", description: "Ultimate peaceful escape" },
      { icon: Users, label: "4 Guests Max", description: "Cozy meadow camping" },
    ],
    details: [
      "Elevated tent platform",
      "Panoramic mountain views",
      "Dark sky certified area",
      "Wildflower meadow access",
      "Alpine hiking trails",
      "Wildlife spotting opportunities",
    ],
    reviews: [
      { author: "Rachel W.", rating: 5, date: "December 2025", comment: "The stargazing here is incredible! We saw the Milky Way so clearly." },
      { author: "Tom D.", rating: 4, date: "November 2025", comment: "Beautiful open meadow with amazing views. A bit windy but absolutely worth it." },
      { author: "Sophie N.", rating: 5, date: "October 2025", comment: "Wildflowers were still blooming and the sunset views were spectacular." },
      { author: "Mark J.", rating: 5, date: "September 2025", comment: "Photographed some amazing wildlife. Saw elk grazing in the early morning!" },
    ],
  },
  {
    id: "canyon",
    name: "Canyon Ridge",
    location: "Desert Southwest",
    description: "Discover the dramatic beauty of red rock canyons. This unique desert oasis offers stunning sunrise views, ancient rock formations, and a tranquil setting far from the noise of city life.",
    rating: 4.7,
    price: 65,
    image: detailForest1,
    images: [detailMeadow1, spotForest, detailLake2],
    features: ["Desert views", "Stargazing", "Rock formations"],
    featured: false,
    amenities: [
      { icon: Flame, label: "Fire Circle", description: "Traditional fire circle with seating" },
      { icon: Droplets, label: "Water Cache", description: "Fresh water supply station" },
      { icon: WifiOff, label: "Off-Grid", description: "Complete disconnection" },
      { icon: Users, label: "4 Guests Max", description: "Intimate desert experience" },
    ],
    details: [
      "Shaded tent platform",
      "Sunset viewing deck",
      "Desert wildlife guides",
      "Night sky telescope available",
      "Canyon hiking trails",
      "All camping gear included",
    ],
    reviews: [
      { author: "John S.", rating: 5, date: "January 2026", comment: "The red rock sunrises are absolutely stunning. Best desert camping ever!" },
      { author: "Maria G.", rating: 4, date: "December 2025", comment: "Unique landscape and great stargazing. Bring layers - desert nights are cold!" },
      { author: "Kevin R.", rating: 5, date: "November 2025", comment: "The telescope they provide is amazing. Saw Saturn's rings clearly!" },
      { author: "Jennifer L.", rating: 5, date: "October 2025", comment: "Perfect escape from reality. The silence of the desert is healing." },
    ],
  },
  {
    id: "river",
    name: "River Bend",
    location: "Coastal Range",
    description: "Nestled along a pristine river, this coastal retreat offers the soothing sounds of flowing water and easy access to both forest and river adventures. Perfect for those seeking a balanced escape.",
    rating: 4.9,
    price: 110,
    image: detailLake1,
    images: [detailLake2, spotLake, detailForest2],
    features: ["River access", "Fishing", "Forest trails"],
    featured: false,
    amenities: [
      { icon: Droplets, label: "River Access", description: "Private riverfront location" },
      { icon: Flame, label: "Fire Pit", description: "Riverside fire pit" },
      { icon: WifiOff, label: "Remote", description: "Peaceful riverside escape" },
      { icon: Users, label: "6 Guests Max", description: "Family-friendly size" },
    ],
    details: [
      "Riverside tent platform",
      "Fishing equipment provided",
      "Canoe rental available",
      "Nature walks guided",
      "Bird watching opportunities",
      "Premium camping equipment",
    ],
    reviews: [
      { author: "Brian H.", rating: 5, date: "January 2026", comment: "Falling asleep to the sound of the river is pure bliss. Caught several trout!" },
      { author: "Amanda C.", rating: 5, date: "December 2025", comment: "Perfect for our family. Kids loved playing by the river all day." },
      { author: "Steve M.", rating: 4, date: "November 2025", comment: "Great fishing spot. The guided nature walk was informative and fun." },
      { author: "Karen B.", rating: 5, date: "October 2025", comment: "Saw so many birds! The canoe trip down the river was magical." },
    ],
  },
  {
    id: "summit",
    name: "Summit Peak",
    location: "Rocky Mountains",
    description: "For the adventurous soul, this high-altitude retreat offers breathtaking mountain panoramas and crisp alpine air. Wake up above the clouds in one of our most exclusive and remote locations.",
    rating: 4.6,
    price: 120,
    image: detailMeadow1,
    images: [detailMeadow2, spotMeadow, detailForest1],
    features: ["High altitude", "Mountain views", "Adventure trails"],
    featured: false,
    amenities: [
      { icon: Flame, label: "Alpine Fire Pit", description: "Elevated fire pit with views" },
      { icon: Droplets, label: "Spring Water", description: "Mountain spring access" },
      { icon: WifiOff, label: "Remote", description: "Ultimate mountain escape" },
      { icon: Users, label: "4 Guests Max", description: "Exclusive experience" },
    ],
    details: [
      "Insulated tent platform",
      "360-degree mountain views",
      "Summit hiking trails",
      "Wildlife photography spots",
      "Premium gear included",
      "Guided options available",
    ],
    reviews: [
      { author: "Daniel F.", rating: 5, date: "January 2026", comment: "Above the clouds! The sunrise from the summit was life-changing." },
      { author: "Nicole T.", rating: 4, date: "December 2025", comment: "Challenging hike to get there but so worth it. Bring warm clothes!" },
      { author: "Robert K.", rating: 5, date: "November 2025", comment: "Most epic camping spot ever. Felt like we were on top of the world." },
      { author: "Laura S.", rating: 4, date: "October 2025", comment: "Incredible views and very well maintained. Not for the faint of heart!" },
    ],
  },
];

export const getFeaturedLocations = () => locations.filter(loc => loc.featured);

export const getLocationById = (id: string) => locations.find(loc => loc.id === id);
