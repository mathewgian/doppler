import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Calendar, Users, DollarSign, MapPin, Mail, Phone, ArrowLeft, LogOut, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { mockBookings, getBookingStats } from "@/data/bookings";
import { locations, getLocationById } from "@/data/locations";
import { useAuth } from "@/hooks/useAuth";

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const { user, loading, signOut } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState("all");
  const stats = getBookingStats();

  useEffect(() => {
    if (!loading && !user && !isDemo) {
      navigate("/auth");
    }
  }, [loading, user, navigate, isDemo]);

  if (loading && !isDemo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground font-light">Loading...</p>
      </div>
    );
  }

  const filteredBookings = selectedLocation === "all" 
    ? mockBookings 
    : mockBookings.filter(b => b.locationId === selectedLocation);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const calculateRevenue = () => {
    return filteredBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((total, booking) => {
        const location = getLocationById(booking.locationId);
        if (!location) return total;
        const nights = Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24));
        return total + (location.price * nights);
      }, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation variant="dark" />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6 lg:px-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-[11px] uppercase tracking-wider font-normal"
              >
                <ArrowLeft className="mr-2 h-3 w-3" />
                Back to Home
              </Button>
              {isDemo ? (
                <Badge variant="outline" className="gap-1 text-xs font-light border-primary/30 text-primary">
                  <Eye className="h-3 w-3" />
                  Demo Mode
                </Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-[11px] uppercase tracking-wider font-normal text-destructive hover:text-destructive"
                >
                  <LogOut className="mr-2 h-3 w-3" />
                  Sign Out
                </Button>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-light mb-3 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              Manage your property bookings and monitor performance
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
            <Card className="p-6 border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-light mb-1">{stats.total}</p>
              <p className="text-xs text-muted-foreground font-light">Total Bookings</p>
            </Card>
            
            <Card className="p-6 border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-light mb-1">{stats.upcoming}</p>
              <p className="text-xs text-muted-foreground font-light">Upcoming</p>
            </Card>
            
            <Card className="p-6 border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
              <p className="text-2xl font-light mb-1">{stats.pending}</p>
              <p className="text-xs text-muted-foreground font-light">Pending</p>
            </Card>
            
            <Card className="p-6 border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-light mb-1">${calculateRevenue().toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-light">Est. Revenue</p>
            </Card>
          </motion.div>

          {/* Location Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Tabs defaultValue="all" onValueChange={setSelectedLocation}>
              <TabsList className="mb-6 flex-wrap h-auto gap-2 bg-transparent p-0">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 text-xs font-light border border-border"
                >
                  All Locations
                </TabsTrigger>
                {locations.map((loc) => (
                  <TabsTrigger 
                    key={loc.id} 
                    value={loc.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 text-xs font-light border border-border"
                  >
                    {loc.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedLocation} className="mt-0">
                <Card className="border border-border shadow-soft overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-[11px] uppercase tracking-wider font-normal">Guest</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-normal">Location</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-normal">Dates</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-normal">Guests</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-normal">Status</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider font-normal">Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((booking) => {
                          const location = getLocationById(booking.locationId);
                          return (
                            <TableRow key={booking.id} className="border-border">
                              <TableCell>
                                <div>
                                  <p className="text-sm font-normal">{booking.guestName}</p>
                                  <p className="text-xs text-muted-foreground font-light">{booking.id}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-light">{location?.name || booking.locationId}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-light">
                                  <p>{format(booking.checkIn, "MMM d")} - {format(booking.checkOut, "MMM d, yyyy")}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24))} nights
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-light">{booking.guests}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-light capitalize ${getStatusColor(booking.status)}`}
                                >
                                  {booking.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <a 
                                    href={`mailto:${booking.email}`} 
                                    className="text-xs text-muted-foreground hover:text-primary font-light flex items-center gap-1"
                                  >
                                    <Mail className="h-3 w-3" />
                                    {booking.email}
                                  </a>
                                  <a 
                                    href={`tel:${booking.phone}`} 
                                    className="text-xs text-muted-foreground hover:text-primary font-light flex items-center gap-1"
                                  >
                                    <Phone className="h-3 w-3" />
                                    {booking.phone}
                                  </a>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {filteredBookings.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-sm text-muted-foreground font-light">No bookings found for this location</p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
