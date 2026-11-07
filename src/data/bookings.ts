export interface Booking {
  id: string;
  locationId: string;
  guestName: string;
  email: string;
  phone: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Date;
}

// Mock bookings data for demonstration
export const mockBookings: Booking[] = [
  {
    id: "BK001",
    locationId: "forest",
    guestName: "John Smith",
    email: "john.smith@email.com",
    phone: "+44 7700 900001",
    checkIn: new Date("2026-01-20"),
    checkOut: new Date("2026-01-25"),
    guests: 2,
    status: "confirmed",
    createdAt: new Date("2026-01-10"),
  },
  {
    id: "BK002",
    locationId: "lake",
    guestName: "Emma Wilson",
    email: "emma.wilson@email.com",
    phone: "+44 7700 900002",
    checkIn: new Date("2026-01-22"),
    checkOut: new Date("2026-01-24"),
    guests: 4,
    status: "pending",
    createdAt: new Date("2026-01-12"),
  },
  {
    id: "BK003",
    locationId: "meadow",
    guestName: "Michael Brown",
    email: "m.brown@email.com",
    phone: "+44 7700 900003",
    checkIn: new Date("2026-01-18"),
    checkOut: new Date("2026-01-21"),
    guests: 3,
    status: "confirmed",
    createdAt: new Date("2026-01-08"),
  },
  {
    id: "BK004",
    locationId: "canyon",
    guestName: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+44 7700 900004",
    checkIn: new Date("2026-01-25"),
    checkOut: new Date("2026-01-28"),
    guests: 2,
    status: "confirmed",
    createdAt: new Date("2026-01-14"),
  },
  {
    id: "BK005",
    locationId: "river",
    guestName: "David Lee",
    email: "d.lee@email.com",
    phone: "+44 7700 900005",
    checkIn: new Date("2026-02-01"),
    checkOut: new Date("2026-02-05"),
    guests: 5,
    status: "pending",
    createdAt: new Date("2026-01-13"),
  },
  {
    id: "BK006",
    locationId: "summit",
    guestName: "Jennifer Taylor",
    email: "jen.taylor@email.com",
    phone: "+44 7700 900006",
    checkIn: new Date("2026-02-10"),
    checkOut: new Date("2026-02-14"),
    guests: 2,
    status: "confirmed",
    createdAt: new Date("2026-01-15"),
  },
  {
    id: "BK007",
    locationId: "forest",
    guestName: "Robert Clark",
    email: "r.clark@email.com",
    phone: "+44 7700 900007",
    checkIn: new Date("2026-01-28"),
    checkOut: new Date("2026-01-30"),
    guests: 4,
    status: "cancelled",
    createdAt: new Date("2026-01-05"),
  },
  {
    id: "BK008",
    locationId: "lake",
    guestName: "Lisa Anderson",
    email: "lisa.a@email.com",
    phone: "+44 7700 900008",
    checkIn: new Date("2026-02-15"),
    checkOut: new Date("2026-02-20"),
    guests: 3,
    status: "confirmed",
    createdAt: new Date("2026-01-14"),
  },
  {
    id: "BK009",
    locationId: "meadow",
    guestName: "Chris Martinez",
    email: "c.martinez@email.com",
    phone: "+44 7700 900009",
    checkIn: new Date("2026-01-30"),
    checkOut: new Date("2026-02-02"),
    guests: 2,
    status: "pending",
    createdAt: new Date("2026-01-12"),
  },
  {
    id: "BK010",
    locationId: "canyon",
    guestName: "Amy Thompson",
    email: "amy.t@email.com",
    phone: "+44 7700 900010",
    checkIn: new Date("2026-02-05"),
    checkOut: new Date("2026-02-08"),
    guests: 4,
    status: "confirmed",
    createdAt: new Date("2026-01-11"),
  },
  {
    id: "BK011",
    locationId: "river",
    guestName: "Kevin White",
    email: "k.white@email.com",
    phone: "+44 7700 900011",
    checkIn: new Date("2026-02-12"),
    checkOut: new Date("2026-02-16"),
    guests: 6,
    status: "confirmed",
    createdAt: new Date("2026-01-10"),
  },
  {
    id: "BK012",
    locationId: "summit",
    guestName: "Nancy Davis",
    email: "n.davis@email.com",
    phone: "+44 7700 900012",
    checkIn: new Date("2026-02-20"),
    checkOut: new Date("2026-02-24"),
    guests: 2,
    status: "pending",
    createdAt: new Date("2026-01-13"),
  },
];

export const getBookingsByLocation = (locationId: string) => 
  mockBookings.filter(booking => booking.locationId === locationId);

export const getUpcomingBookings = () => {
  const today = new Date();
  return mockBookings.filter(booking => 
    booking.checkIn >= today && booking.status !== 'cancelled'
  );
};

export const getBookingStats = () => {
  const today = new Date();
  const confirmed = mockBookings.filter(b => b.status === 'confirmed').length;
  const pending = mockBookings.filter(b => b.status === 'pending').length;
  const upcoming = mockBookings.filter(b => b.checkIn >= today && b.status !== 'cancelled').length;
  
  return { total: mockBookings.length, confirmed, pending, upcoming };
};
