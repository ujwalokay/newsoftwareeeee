import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, CalendarIcon, Award, Percent, Clock, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isSameDay } from "date-fns";

interface AddBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (booking: {
    category: string;
    seatNumbers: number[];
    customerName: string;
    whatsappNumber?: string;
    duration: string;
    price: string;
    personCount: number;
    bookingType: string[];
    bookingDate?: Date;
    timeSlot?: string;
  }) => void;
  availableSeats: {
    category: string;
    seats: number[];
  }[];
}

interface PricingConfig {
  category: string;
  duration: string;
  price: number;
  personCount?: number;
}

interface HappyHoursConfig {
  id: string;
  category: string;
  startTime: string;
  endTime: string;
  enabled: number;
}

interface HappyHoursPricing {
  id: string;
  category: string;
  duration: string;
  price: string;
  personCount: number;
}

interface Booking {
  id: string;
  category: string;
  seatNumber: number;
  seatName: string;
  customerName: string;
  whatsappNumber?: string;
  startTime: string;
  endTime: string;
  price: string;
  status: string;
  bookingType: string[];
  pausedRemainingTime?: number;
  foodOrders: Array<{
    foodId: string;
    foodName: string;
    price: string;
    quantity: number;
  }>;
  createdAt: string;
}

export function AddBookingDialog({ open, onOpenChange, onConfirm, availableSeats }: AddBookingDialogProps) {
  const [category, setCategory] = useState<string>("");
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [generatedGroupId, setGeneratedGroupId] = useState<string>("");
  const [deviceCustomers, setDeviceCustomers] = useState<Record<number, { name: string; phone: string; isPhoneFocused: boolean }>>({});
  const [activeTab, setActiveTab] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [personCount, setPersonCount] = useState<number>(1);
  const [bookingType, setBookingType] = useState<"walk-in" | "upcoming">("walk-in");
  const [bookingDate, setBookingDate] = useState<Date>();
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [timePeriodFilter, setTimePeriodFilter] = useState<"all" | "am" | "pm">("all");
  const [useHappyHoursPricing, setUseHappyHoursPricing] = useState<boolean>(false);
  const [usePromotionalDiscount, setUsePromotionalDiscount] = useState<boolean>(false);
  const [usePromotionalBonus, setUsePromotionalBonus] = useState<boolean>(false);
  const [manualDiscountPercentage, setManualDiscountPercentage] = useState<string>("");
  const [manualFreeHoursHr, setManualFreeHoursHr] = useState<string>("");
  const [manualFreeHoursMin, setManualFreeHoursMin] = useState<string>("");
  const [showAddons, setShowAddons] = useState<boolean>(false);

  const { data: pricingConfig = [] } = useQuery<PricingConfig[]>({
    queryKey: ["/api/pricing-config"],
  });

  const { data: happyHoursConfigs = [] } = useQuery<HappyHoursConfig[]>({
    queryKey: ["/api/happy-hours-config"],
  });

  const { data: happyHoursPricing = [] } = useQuery<HappyHoursPricing[]>({
    queryKey: ["/api/happy-hours-pricing"],
  });

  const { data: happyHoursStatus } = useQuery<{ active: boolean }>({
    queryKey: ["/api/happy-hours-active", category],
    queryFn: async () => {
      if (!category) return { active: false };
      const response = await fetch(`/api/happy-hours-active/${category}`);
      if (!response.ok) throw new Error('Failed to check happy hours status');
      return response.json();
    },
    enabled: !!category && bookingType === "walk-in",
  });

  // Check if Happy Hours is active for the selected upcoming time slot
  const { data: upcomingHappyHoursStatus } = useQuery<{ active: boolean }>({
    queryKey: ["/api/happy-hours-active-for-time", category, timeSlot],
    queryFn: async () => {
      if (!category || !timeSlot) return { active: false };
      const response = await fetch(`/api/happy-hours-active-for-time/${category}?timeSlot=${timeSlot}`);
      if (!response.ok) throw new Error('Failed to check happy hours status for time slot');
      return response.json();
    },
    enabled: !!category && !!timeSlot && bookingType === "upcoming",
  });

  // Check if happy hours is active for walk-in bookings (current time)
  const isWalkInHappyHoursActive = useMemo(() => {
    return bookingType === "walk-in" && happyHoursStatus?.active;
  }, [bookingType, happyHoursStatus]);

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: bookingType === "upcoming" && !!bookingDate,
  });

  const { data: upcomingAvailableSeats = [], isLoading: isLoadingSeats } = useQuery<{ category: string; seats: number[] }[]>({
    queryKey: ["/api/bookings/available-seats", { 
      date: bookingDate?.toISOString(), 
      timeSlot, 
      durationMinutes 
    }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { date?: string; timeSlot?: string; durationMinutes?: number }];
      const searchParams = new URLSearchParams();
      if (params.date) searchParams.append('date', params.date);
      if (params.timeSlot) searchParams.append('timeSlot', params.timeSlot);
      if (params.durationMinutes) searchParams.append('durationMinutes', params.durationMinutes.toString());
      
      const response = await fetch(`${url}?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available seats');
      }
      return response.json();
    },
    enabled: bookingType === "upcoming" && !!bookingDate && !!timeSlot && durationMinutes > 0,
  });

  const seatsToDisplay = bookingType === "upcoming" && bookingDate && timeSlot && durationMinutes > 0
    ? upcomingAvailableSeats
    : availableSeats;

  const selectedCategory = seatsToDisplay.find(c => c.category === category);
  
  // Get Happy Hours config for the category
  const happyHoursConfig = happyHoursConfigs.find(config => 
    config.category === category && config.enabled === 1
  );
  
  const slots = category 
    ? pricingConfig
        .filter(config => config.category === category)
        .map(config => ({ duration: config.duration, price: config.price, personCount: config.personCount }))
    : [];
  
  // Get Happy Hours pricing slots for the category
  const happyHoursSlots = category
    ? happyHoursPricing
        .filter(pricing => pricing.category === category)
        .map(pricing => ({ duration: pricing.duration, price: pricing.price, personCount: pricing.personCount }))
    : [];
  
  const getDurationString = (mins: number) => {
    if (mins < 60) return `${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMins} mins`;
  };

  const duration = getDurationString(durationMinutes);
  
  const { data: availablePromotions } = useQuery<{
    discount: { id: string; percentage: number; description: string } | null;
    bonus: { id: string; hours: string; description: string } | null;
  }>({
    queryKey: ["/api/bookings/check-promotions", category, duration, personCount],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: category || '',
        duration: duration || '',
        personCount: personCount.toString()
      });
      const response = await fetch(`/api/bookings/check-promotions?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to check promotions');
      return response.json();
    },
    enabled: !!category && !!duration && !useHappyHoursPricing,
  });
  
  // For PS5, match both duration and personCount; for others, just match duration
  const selectedSlot = category === "PS5" 
    ? slots.find(s => s.duration === duration && s.personCount === personCount)
    : slots.find(s => s.duration === duration);
  const selectedHappyHoursSlot = category === "PS5"
    ? happyHoursSlots.find(s => s.duration === duration && s.personCount === personCount)
    : happyHoursSlots.find(s => s.duration === duration);

  // Calculate final price
  const calculateFinalPrice = () => {
    const shouldUseHappyHoursPricing = (bookingType === "walk-in" && useHappyHoursPricing) || (bookingType === "upcoming" && useHappyHoursPricing);
    const slot = shouldUseHappyHoursPricing ? selectedHappyHoursSlot : selectedSlot;
    if (!slot) return null;

    let basePrice = parseFloat(slot.price.toString());
    
    // Apply manual discount percentage
    if (manualDiscountPercentage && parseFloat(manualDiscountPercentage) > 0) {
      const discountAmount = (basePrice * parseFloat(manualDiscountPercentage)) / 100;
      basePrice = basePrice - discountAmount;
    }

    return Math.round(basePrice).toString();
  };

  // Calculate price breakdown for preview
  const getPriceBreakdown = () => {
    const shouldUseHappyHoursPricing = (bookingType === "walk-in" && useHappyHoursPricing) || (bookingType === "upcoming" && useHappyHoursPricing);
    const slot = shouldUseHappyHoursPricing ? selectedHappyHoursSlot : selectedSlot;
    if (!slot) return null;

    const originalPrice = parseFloat(slot.price.toString());
    let discount = 0;
    let discountType = "";

    // Calculate discount from manual discount percentage
    if (manualDiscountPercentage && parseFloat(manualDiscountPercentage) > 0) {
      discount = (originalPrice * parseFloat(manualDiscountPercentage)) / 100;
      discountType = `${manualDiscountPercentage}% Manual Discount`;
    }

    const finalPrice = originalPrice - discount;

    return {
      originalPrice: Math.round(originalPrice),
      discount: Math.round(discount),
      discountType,
      finalPrice: Math.round(finalPrice),
      hasDiscount: discount > 0
    };
  };

  const priceBreakdown = getPriceBreakdown();
  
  // Check if next person count has pricing configured (for PS5)
  const hasNextPersonPricing = category === "PS5" && !useHappyHoursPricing
    ? slots.some(s => s.duration === duration && s.personCount === personCount + 1)
    : false;
  const hasNextPersonHappyHoursPricing = category === "PS5" && useHappyHoursPricing
    ? happyHoursSlots.some(s => s.duration === duration && s.personCount === personCount + 1)
    : false;

  const generateGroupId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GRP-${timestamp}-${random}`;
  };

  const toggleSeat = (seatNumber: number) => {
    setSelectedSeats(prev => {
      const newSeats = prev.includes(seatNumber)
        ? prev.filter(s => s !== seatNumber)
        : [...prev, seatNumber];
      
      if (!prev.includes(seatNumber)) {
        setDeviceCustomers(prevCustomers => ({
          ...prevCustomers,
          [seatNumber]: { name: "", phone: "", isPhoneFocused: false }
        }));
        
        if (!activeTab || activeTab === "") {
          setActiveTab(seatNumber.toString());
        }
      } else {
        setDeviceCustomers(prevCustomers => {
          const { [seatNumber]: _, ...rest } = prevCustomers;
          return rest;
        });
        
        if (activeTab === seatNumber.toString() && newSeats.length > 0) {
          setActiveTab(newSeats[0].toString());
        }
      }
      
      if (newSeats.length > 1 && !generatedGroupId) {
        setGeneratedGroupId(generateGroupId());
      } else if (newSeats.length <= 1) {
        setGeneratedGroupId("");
      }
      
      return newSeats;
    });
  };
  
  const updateDeviceCustomer = (seatNumber: number, field: 'name' | 'phone' | 'isPhoneFocused', value: string | boolean) => {
    setDeviceCustomers(prev => ({
      ...prev,
      [seatNumber]: {
        ...prev[seatNumber],
        [field]: value
      }
    }));
  };

  const handleConfirm = async () => {
    const isDateRequired = bookingType === "upcoming" && !bookingDate;
    const isTimeSlotRequired = bookingType === "upcoming" && !timeSlot;
    
    let allDevicesHaveCustomers = true;
    let invalidPhones: number[] = [];
    
    for (const seatNumber of selectedSeats) {
      const customer = deviceCustomers[seatNumber];
      if (!customer || !customer.name.trim()) {
        allDevicesHaveCustomers = false;
        break;
      }
      
      if (bookingType === "upcoming") {
        if (!customer.phone.trim()) {
          allDevicesHaveCustomers = false;
          break;
        }
        if (customer.phone.trim() && customer.phone.length !== 10) {
          invalidPhones.push(seatNumber);
        }
      } else if (customer.phone.trim() && customer.phone.length !== 10) {
        invalidPhones.push(seatNumber);
      }
    }
    
    // Determine which pricing to use
    const shouldUseHappyHoursPricing = (bookingType === "walk-in" && useHappyHoursPricing) || (bookingType === "upcoming" && useHappyHoursPricing);
    const hasValidPrice = shouldUseHappyHoursPricing ? selectedHappyHoursSlot : selectedSlot;
    
    if (category && selectedSeats.length > 0 && allDevicesHaveCustomers && invalidPhones.length === 0 && duration && hasValidPrice && !isDateRequired && !isTimeSlotRequired) {
      let finalPersonCount: number;
      
      if (shouldUseHappyHoursPricing) {
        finalPersonCount = category === "PS5" ? personCount : 1;
      } else if (category === "PS5") {
        finalPersonCount = personCount;
      } else {
        finalPersonCount = 1;
      }
      
      const finalPrice = calculateFinalPrice() || hasValidPrice.price.toString();
      
      let bookingTypes: string[];
      if (bookingType === "upcoming" && useHappyHoursPricing) {
        bookingTypes = ["upcoming", "happy-hours"];
      } else if (bookingType === "walk-in" && useHappyHoursPricing) {
        bookingTypes = ["walk-in", "happy-hours"];
      } else {
        bookingTypes = [bookingType];
      }
      
      let manualFreeHours: string | undefined = undefined;
      if (manualFreeHoursHr || manualFreeHoursMin) {
        const hours = parseInt(manualFreeHoursHr) || 0;
        const minutes = parseInt(manualFreeHoursMin) || 0;
        manualFreeHours = `${hours}:${minutes.toString().padStart(2, '0')}`;
      }
      
      // Create session group if multiple devices are selected
      let groupId: string | undefined = undefined;
      let groupCode: string | undefined = undefined;
      if (selectedSeats.length > 1 && generatedGroupId) {
        try {
          const response = await fetch("/api/session-groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              groupName: generatedGroupId,
              category,
              bookingType: bookingTypes,
            }),
          });
          
          if (response.ok) {
            const sessionGroup = await response.json();
            groupId = sessionGroup.id;
            groupCode = sessionGroup.groupCode;
          }
        } catch (error) {
          console.error("Failed to create session group:", error);
        }
      }
      
      for (const seatNumber of selectedSeats) {
        const customer = deviceCustomers[seatNumber];
        onConfirm?.({
          category,
          seatNumbers: [seatNumber],
          customerName: customer.name,
          whatsappNumber: customer.phone.trim() || undefined,
          duration,
          price: finalPrice,
          personCount: finalPersonCount,
          bookingType: bookingTypes,
          bookingDate: bookingType === "upcoming" ? bookingDate : undefined,
          timeSlot: bookingType === "upcoming" ? timeSlot : undefined,
          usePromotionalDiscount,
          usePromotionalBonus,
          manualDiscountPercentage: manualDiscountPercentage ? parseInt(manualDiscountPercentage) : undefined,
          manualFreeHours: manualFreeHours,
          groupId: groupId,
          groupCode: groupCode,
        } as any);
      }
      
      setCategory("");
      setSelectedSeats([]);
      setGeneratedGroupId("");
      setDeviceCustomers({});
      setActiveTab("");
      setDurationMinutes(30);
      setPersonCount(1);
      setBookingType("walk-in");
      setBookingDate(undefined);
      setTimeSlot("");
      setUseHappyHoursPricing(false);
      setUsePromotionalDiscount(false);
      setUsePromotionalBonus(false);
      setManualDiscountPercentage("");
      setManualFreeHoursHr("");
      setManualFreeHoursMin("");
      setShowAddons(false);
      onOpenChange(false);
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setSelectedSeats([]);
    setPersonCount(1);
    setUseHappyHoursPricing(false);
  };

  const increaseDuration = () => {
    setDurationMinutes(prev => prev + 30);
  };

  const decreaseDuration = () => {
    setDurationMinutes(prev => Math.max(30, prev - 30));
  };

  const increasePersonCount = () => {
    setPersonCount(prev => prev + 1);
  };

  const decreasePersonCount = () => {
    setPersonCount(prev => Math.max(1, prev - 1));
  };

  const latestBookingEndTime = useMemo(() => {
    if (!bookingDate || !allBookings.length) return null;
    
    const isToday = isSameDay(bookingDate, new Date());
    if (!isToday) return null;
    
    const todayBookings = allBookings.filter(booking => {
      const bookingStart = new Date(booking.startTime);
      return isSameDay(bookingStart, bookingDate) && 
             (booking.status === "running" || booking.status === "paused" || booking.status === "upcoming");
    });
    
    if (todayBookings.length === 0) return null;
    
    const latestEnd = todayBookings.reduce((latest, booking) => {
      const endTime = new Date(booking.endTime);
      return endTime > latest ? endTime : latest;
    }, new Date(0));
    
    return latestEnd;
  }, [bookingDate, allBookings]);

  const generateTimeSlots = () => {
    const allSlots = [];
    const totalMinutesInDay = 24 * 60;
    
    let startMinutes = 0;
    
    if (latestBookingEndTime && bookingDate && isSameDay(bookingDate, new Date())) {
      const endHour = latestBookingEndTime.getHours();
      const endMin = latestBookingEndTime.getMinutes();
      startMinutes = endHour * 60 + endMin;
    }
    
    while (startMinutes < totalMinutesInDay) {
      const endMinutes = startMinutes + durationMinutes;
      if (endMinutes > totalMinutesInDay) break;
      
      const startHour = Math.floor(startMinutes / 60);
      const startMin = startMinutes % 60;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      
      const formatTime = (hour: number, min: number) => {
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const displayMin = min.toString().padStart(2, '0');
        return `${displayHour}:${displayMin} ${period}`;
      };
      
      const label = `${formatTime(startHour, startMin)} - ${formatTime(endHour, endMin)}`;
      const value = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}-${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      allSlots.push({ label, value, startHour });
      
      startMinutes = endMinutes;
    }
    
    if (timePeriodFilter === "am") {
      return allSlots.filter(slot => slot.startHour < 12);
    } else if (timePeriodFilter === "pm") {
      return allSlots.filter(slot => slot.startHour >= 12);
    }
    
    return allSlots;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-booking">
        <DialogHeader>
          <DialogTitle>Add New Booking</DialogTitle>
          <DialogDescription>
            Select multiple seats for the same customer and time slot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Booking Type</Label>
            <RadioGroup value={bookingType} onValueChange={(value) => setBookingType(value as "walk-in" | "upcoming")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="walk-in" id="walk-in" data-testid="radio-walk-in" />
                <Label htmlFor="walk-in" className="cursor-pointer font-normal">Walk-in (Start Now)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upcoming" id="upcoming" data-testid="radio-upcoming" />
                <Label htmlFor="upcoming" className="cursor-pointer font-normal">Upcoming Booking</Label>
              </div>
            </RadioGroup>
          </div>

          {bookingType === "upcoming" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration <span className="text-destructive">*</span></Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        value={Math.floor(durationMinutes / 60)}
                        onChange={(e) => {
                          const hours = Math.max(0, parseInt(e.target.value) || 0);
                          const mins = durationMinutes % 60;
                          setDurationMinutes(hours * 60 + mins);
                        }}
                        className="w-16 text-center"
                        data-testid="input-hours"
                      />
                      <span className="text-sm text-muted-foreground">hr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        step="30"
                        value={durationMinutes % 60}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          const mins = value >= 30 ? 30 : 0;
                          const hours = Math.floor(durationMinutes / 60);
                          setDurationMinutes(hours * 60 + mins);
                        }}
                        className="w-16 text-center"
                        data-testid="input-minutes"
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="icon"
                      onClick={decreaseDuration}
                      disabled={durationMinutes <= 30}
                      data-testid="button-decrease-duration"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="icon"
                      onClick={increaseDuration}
                      data-testid="button-increase-duration"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bookingDate ? format(bookingDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={bookingDate}
                      onSelect={setBookingDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeSlot">
                  Time Slot <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <Button
                    type="button"
                    variant={timePeriodFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimePeriodFilter("all")}
                    data-testid="button-filter-all"
                  >
                    All Day
                  </Button>
                  <Button
                    type="button"
                    variant={timePeriodFilter === "am" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimePeriodFilter("am")}
                    data-testid="button-filter-am"
                  >
                    AM
                  </Button>
                  <Button
                    type="button"
                    variant={timePeriodFilter === "pm" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimePeriodFilter("pm")}
                    data-testid="button-filter-pm"
                  >
                    PM
                  </Button>
                </div>
                <Select value={timeSlot} onValueChange={setTimeSlot}>
                  <SelectTrigger id="timeSlot" data-testid="select-time-slot">
                    <SelectValue placeholder={`Select ${duration} time slot`} />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeSlots().map((slot) => (
                      <SelectItem key={slot.value} value={slot.value} data-testid={`option-timeslot-${slot.value}`}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Happy Hours Pricing Option for Upcoming Bookings */}
              {category && upcomingHappyHoursStatus?.active && happyHoursSlots.length > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                  <Checkbox
                    id="use-happy-hours-pricing"
                    checked={useHappyHoursPricing}
                    onCheckedChange={(checked) => setUseHappyHoursPricing(checked as boolean)}
                    data-testid="checkbox-use-happy-hours-pricing"
                  />
                  <div className="flex-1">
                    <Label htmlFor="use-happy-hours-pricing" className="cursor-pointer font-medium text-yellow-900 dark:text-yellow-100">
                      Use Happy Hours Pricing 🎉
                    </Label>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      This time slot falls within Happy Hours! Get special pricing.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {(bookingType === "walk-in" || (bookingType === "upcoming" && bookingDate && timeSlot && durationMinutes > 0)) && (
            <div className="space-y-2">
              <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category" data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSeats && bookingType === "upcoming" ? (
                    <SelectItem value="loading" disabled data-testid="option-loading">
                      Loading available seats...
                    </SelectItem>
                  ) : seatsToDisplay.length === 0 ? (
                    <SelectItem value="none" disabled data-testid="option-no-seats">
                      No seats available for this time slot
                    </SelectItem>
                  ) : (
                    seatsToDisplay.map((cat) => (
                      <SelectItem key={cat.category} value={cat.category} data-testid={`option-${cat.category.toLowerCase()}`}>
                        {cat.category} ({cat.seats.length} available)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {category && selectedCategory && selectedCategory.seats.length > 0 && (
            <div className="space-y-2">
              <Label>
                Select Devices ({selectedSeats.length} selected)
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-3 border rounded-md bg-muted/30">
                {selectedCategory.seats.map((seat) => (
                  <div
                    key={seat}
                    className="flex items-center space-x-2"
                    data-testid={`checkbox-seat-${seat}`}
                  >
                    <Checkbox
                      id={`seat-${seat}`}
                      checked={selectedSeats.includes(seat)}
                      onCheckedChange={() => toggleSeat(seat)}
                    />
                    <Label
                      htmlFor={`seat-${seat}`}
                      className="cursor-pointer text-sm font-normal whitespace-nowrap"
                    >
                      {category}-{seat}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedSeats.length > 1 && generatedGroupId && (
            <div className="space-y-2">
              <Label>Group ID (Auto-generated)</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md border">
                <span className="font-mono text-sm font-medium" data-testid="text-group-id">
                  {generatedGroupId}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                This will group {selectedSeats.length} devices into one booking session
              </p>
            </div>
          )}

          {selectedSeats.length > 0 && (
            <div className="space-y-2">
              <Label>Customer Details for Each Device</Label>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full flex-wrap h-auto gap-1">
                  {selectedSeats.map((seat) => (
                    <TabsTrigger 
                      key={seat} 
                      value={seat.toString()}
                      data-testid={`tab-device-${seat}`}
                      className="flex-1 min-w-[80px]"
                    >
                      {category}-{seat}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {selectedSeats.map((seat) => {
                  const customer = deviceCustomers[seat] || { name: "", phone: "", isPhoneFocused: false };
                  return (
                    <TabsContent key={seat} value={seat.toString()} className="space-y-3 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor={`customer-name-${seat}`}>
                          Customer Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`customer-name-${seat}`}
                          value={customer.name}
                          onChange={(e) => updateDeviceCustomer(seat, 'name', e.target.value)}
                          placeholder="Enter customer name"
                          data-testid={`input-customer-name-${seat}`}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`whatsapp-${seat}`}>
                          WhatsApp Number {bookingType === "upcoming" && <span className="text-destructive">*</span>}
                        </Label>
                        <div className="relative">
                          <Input
                            id={`whatsapp-${seat}`}
                            value={
                              customer.isPhoneFocused
                                ? customer.phone.replace(/(\d{5})(\d{1,5})/, '$1 $2')
                                : customer.phone.length > 0
                                ? 'xxxxx xxxxx'
                                : ''
                            }
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              if (value.length <= 10) {
                                updateDeviceCustomer(seat, 'phone', value);
                              }
                            }}
                            onFocus={() => updateDeviceCustomer(seat, 'isPhoneFocused', true)}
                            onBlur={() => updateDeviceCustomer(seat, 'isPhoneFocused', false)}
                            placeholder="xxxxx xxxxx"
                            data-testid={`input-whatsapp-${seat}`}
                            className={`pr-16 ${
                              customer.phone.length > 0 && customer.phone.length < 10
                                ? 'border-destructive focus-visible:ring-destructive'
                                : customer.phone.length === 10
                                ? 'border-green-500 focus-visible:ring-green-500'
                                : ''
                            }`}
                          />
                          <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                            customer.phone.length === 0
                              ? 'text-muted-foreground'
                              : customer.phone.length < 10
                              ? 'text-destructive'
                              : 'text-green-600'
                          }`}>
                            {customer.phone.length}/10
                          </div>
                        </div>
                        {customer.phone.length > 0 && customer.phone.length < 10 && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            ⚠️ Please enter all 10 digits ({10 - customer.phone.length} more needed)
                          </p>
                        )}
                        {customer.phone.length === 10 && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            ✓ Valid Indian mobile number
                          </p>
                        )}
                        {bookingType === "upcoming" && customer.phone.length === 0 && (
                          <p className="text-xs text-muted-foreground">Required for upcoming bookings</p>
                        )}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}

          {category === "PS5" && (
            <div className="space-y-2">
              <Label>Number of Persons</Label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={decreasePersonCount}
                    disabled={personCount <= 1}
                    data-testid="button-decrease-person"
                    className="shrink-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center font-semibold py-2" data-testid="text-person-count">
                    {personCount} {personCount === 1 ? 'Person' : 'Persons'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={increasePersonCount}
                    disabled={useHappyHoursPricing ? !hasNextPersonHappyHoursPricing : !hasNextPersonPricing}
                    data-testid="button-increase-person"
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {(useHappyHoursPricing ? selectedHappyHoursSlot : selectedSlot) ? (
                <p className="text-xs text-muted-foreground">
                  {duration} for {personCount} {personCount === 1 ? 'person' : 'persons'}: ₹{
                    useHappyHoursPricing 
                      ? selectedHappyHoursSlot!.price
                      : selectedSlot!.price
                  } (Total Price)
                </p>
              ) : (
                <p className="text-xs text-destructive">
                  No pricing configured for {duration} with {personCount} {personCount === 1 ? 'person' : 'persons'}
                </p>
              )}
            </div>
          )}

          {bookingType === "walk-in" && category && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      value={Math.floor(durationMinutes / 60)}
                      onChange={(e) => {
                        const hours = Math.max(0, parseInt(e.target.value) || 0);
                        const mins = durationMinutes % 60;
                        setDurationMinutes(hours * 60 + mins);
                      }}
                      className="w-16 text-center"
                      data-testid="input-hours"
                    />
                    <span className="text-sm text-muted-foreground">hr</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="30"
                      value={durationMinutes % 60}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        const mins = value >= 30 ? 30 : 0;
                        const hours = Math.floor(durationMinutes / 60);
                        setDurationMinutes(hours * 60 + mins);
                      }}
                      className="w-16 text-center"
                      data-testid="input-minutes"
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon"
                    onClick={decreaseDuration}
                    disabled={durationMinutes <= 30}
                    data-testid="button-decrease-duration"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon"
                    onClick={increaseDuration}
                    data-testid="button-increase-duration"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {bookingType === "walk-in" && selectedSlot && !useHappyHoursPricing && (
                <div className="text-sm text-muted-foreground" data-testid="text-price">
                  Price: ₹{selectedSlot.price}
                </div>
              )}
            </div>
          )}

          {/* Happy Hours Pricing for Walk-in */}
          {bookingType === "walk-in" && category && isWalkInHappyHoursActive && selectedHappyHoursSlot && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
              <Checkbox
                id="use-happy-hours-pricing-walk-in"
                checked={useHappyHoursPricing}
                onCheckedChange={(checked) => setUseHappyHoursPricing(checked as boolean)}
                data-testid="checkbox-use-happy-hours-pricing-walk-in"
              />
              <div className="flex-1">
                <Label htmlFor="use-happy-hours-pricing-walk-in" className="cursor-pointer font-medium text-yellow-900 dark:text-yellow-100">
                  Use Happy Hours Pricing 🎉
                </Label>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  This time slot falls within Happy Hours! Get special pricing.
                </p>
              </div>
            </div>
          )}

          {/* Promotional Discount/Bonus Prompts */}
          {availablePromotions && !useHappyHoursPricing && (
            <div className="space-y-2">
              {availablePromotions.discount && !usePromotionalBonus && !manualFreeHoursHr && !manualFreeHoursMin && (
                <div className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                  <Checkbox
                    id="use-promotional-discount"
                    checked={usePromotionalDiscount}
                    onCheckedChange={(checked) => {
                      setUsePromotionalDiscount(checked as boolean);
                      if (checked) {
                        setUsePromotionalBonus(false);
                        setManualDiscountPercentage("");
                        setManualFreeHoursHr("");
                        setManualFreeHoursMin("");
                      }
                    }}
                    data-testid="checkbox-use-promotional-discount"
                  />
                  <div className="flex-1">
                    <Label htmlFor="use-promotional-discount" className="cursor-pointer font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Discount Promotion Available!
                    </Label>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {availablePromotions.discount.description} - Do you want to use it? 
                      <span className="block text-xs mt-1 font-medium">
                        Note: Add-ons discount cannot be used with promotional discount
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {availablePromotions.bonus && !usePromotionalDiscount && !manualDiscountPercentage && (
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                  <Checkbox
                    id="use-promotional-bonus"
                    checked={usePromotionalBonus}
                    onCheckedChange={(checked) => {
                      setUsePromotionalBonus(checked as boolean);
                      if (checked) {
                        setUsePromotionalDiscount(false);
                        setManualFreeHoursHr("");
                        setManualFreeHoursMin("");
                        setManualDiscountPercentage("");
                      }
                    }}
                    data-testid="checkbox-use-promotional-bonus"
                  />
                  <div className="flex-1">
                    <Label htmlFor="use-promotional-bonus" className="cursor-pointer font-medium text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Bonus Hours Promotion Available!
                    </Label>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      {availablePromotions.bonus.description} - Do you want to use it?
                      <span className="block text-xs mt-1 font-medium">
                        Note: Add-ons cannot be used with promotional bonus
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add-ons Section */}
          {category && !useHappyHoursPricing && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddons(!showAddons)}
                className="w-full justify-between"
                data-testid="button-toggle-addons"
              >
                <span className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
                  Add-ons (Manual Discount/Free Hours)
                </span>
                <Badge variant="secondary">{showAddons ? "Hide" : "Show"}</Badge>
              </Button>

              {showAddons && (
                <Card className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="manual-discount" className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Manual Discount (%)
                    </Label>
                    <Input
                      id="manual-discount"
                      type="number"
                      min="0"
                      max="100"
                      value={manualDiscountPercentage}
                      onChange={(e) => {
                        const value = e.target.value;
                        const numValue = parseFloat(value);
                        
                        // Clamp value between 0 and 100
                        if (value === "" || (numValue >= 0 && numValue <= 100)) {
                          setManualDiscountPercentage(value);
                          if (value) {
                            setManualFreeHoursHr("");
                            setManualFreeHoursMin("");
                            setUsePromotionalDiscount(false);
                            setUsePromotionalBonus(false);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        const numValue = parseFloat(value);
                        
                        // On blur, enforce strict clamping
                        if (value && !isNaN(numValue)) {
                          const clamped = Math.min(100, Math.max(0, numValue));
                          setManualDiscountPercentage(clamped.toString());
                        }
                      }}
                      placeholder="Enter discount percentage"
                      disabled={usePromotionalDiscount || usePromotionalBonus}
                      data-testid="input-manual-discount"
                    />
                    <p className="text-xs text-muted-foreground">
                      {usePromotionalDiscount || usePromotionalBonus 
                        ? "❌ Cannot use manual discount with promotional offers - Uncheck promotional option above to use this" 
                        : "Enter percentage (0-100) for manual discount"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Manual Free Hours
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          id="manual-free-hours-hr"
                          type="number"
                          min="0"
                          max="23"
                          value={manualFreeHoursHr}
                          onChange={(e) => {
                            const value = e.target.value;
                            setManualFreeHoursHr(value);
                            if (value || manualFreeHoursMin) {
                              setManualDiscountPercentage("");
                              setUsePromotionalDiscount(false);
                              setUsePromotionalBonus(false);
                            }
                          }}
                          placeholder="0"
                          disabled={usePromotionalDiscount || usePromotionalBonus}
                          data-testid="input-manual-free-hours-hr"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Hours</p>
                      </div>
                      <span className="text-xl font-bold">:</span>
                      <div className="flex-1">
                        <Input
                          id="manual-free-hours-min"
                          type="number"
                          min="0"
                          max="59"
                          value={manualFreeHoursMin}
                          onChange={(e) => {
                            const value = e.target.value;
                            setManualFreeHoursMin(value);
                            if (value || manualFreeHoursHr) {
                              setManualDiscountPercentage("");
                              setUsePromotionalDiscount(false);
                              setUsePromotionalBonus(false);
                            }
                          }}
                          placeholder="0"
                          disabled={usePromotionalDiscount || usePromotionalBonus}
                          data-testid="input-manual-free-hours-min"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Minutes</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {usePromotionalDiscount || usePromotionalBonus 
                        ? "❌ Cannot use manual free hours with promotional offers - Uncheck promotional option above to use this" 
                        : "Enter hours and minutes separately (e.g., 1 hr 30 min)"}
                    </p>
                  </div>

                </Card>
              )}
            </div>
          )}

          {/* Price Breakdown Preview */}
          {category && priceBreakdown && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Original Price:</span>
                  <span className="font-medium">₹{priceBreakdown.originalPrice}</span>
                </div>
                
                {priceBreakdown.hasDiscount && (
                  <>
                    <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {priceBreakdown.discountType}
                      </span>
                      <span className="font-medium">-₹{priceBreakdown.discount}</span>
                    </div>
                    <div className="border-t border-blue-200 dark:border-blue-800 pt-2"></div>
                  </>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base">Total Amount:</span>
                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    ₹{priceBreakdown.finalPrice}
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground pt-1">
                  for {duration}
                  {(manualFreeHoursHr || manualFreeHoursMin) && (() => {
                    const hours = parseInt(manualFreeHoursHr) || 0;
                    const minutes = parseInt(manualFreeHoursMin) || 0;
                    const freeText = hours > 0 && minutes > 0 
                      ? `${hours}h ${minutes}min`
                      : hours > 0 
                      ? `${hours}h`
                      : `${minutes}min`;
                    return <span className="text-blue-600 dark:text-blue-400 font-medium"> + {freeText} free</span>;
                  })()}
                  {useHappyHoursPricing && " (Happy Hours 🎉)"}
                </p>
              </CardContent>
            </Card>
          )}

          {bookingType === "upcoming" && category && (useHappyHoursPricing ? selectedHappyHoursSlot : selectedSlot) && !priceBreakdown?.hasDiscount && (
            <div className="text-sm text-muted-foreground" data-testid="text-price">
              Price: ₹{useHappyHoursPricing && selectedHappyHoursSlot ? selectedHappyHoursSlot.price : selectedSlot?.price} for {duration}
              {useHappyHoursPricing && selectedHappyHoursSlot && (
                <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                  (Happy Hours 🎉)
                </span>
              )}
            </div>
          )}

        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-booking" className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={
              !category || 
              selectedSeats.length === 0 || 
              !duration || 
              (bookingType === "upcoming" && (!bookingDate || !timeSlot)) ||
              (selectedSeats.length > 1 && !generatedGroupId) ||
              selectedSeats.some(seat => {
                const customer = deviceCustomers[seat];
                if (!customer || !customer.name.trim()) return true;
                if (bookingType === "upcoming" && (!customer.phone.trim() || customer.phone.length !== 10)) return true;
                if (customer.phone.trim() && customer.phone.length !== 10) return true;
                return false;
              })
            }
            data-testid="button-confirm-booking"
            className="w-full sm:w-auto"
          >
            Add Booking {selectedSeats.length > 0 && `(${selectedSeats.length} devices)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
