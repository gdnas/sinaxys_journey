import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart3,
  BookOpen,
  Box,
  Building2,
  CalendarClock,
  CheckCircle2,
  Crown,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Megaphone,
  Network,
  Palette,
  Settings,
  Shield,
  Target,
  TestTube,
  Trophy,
  User as UserIcon,
  Video,
  Wallet,
  Wrench,
  Users2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { isCompanyModuleEnabled } from "@/lib/modulesDb";
import { getCompanyFundamentals } from "@/lib/okrDb";
import { describedItemsToLines, parseDescribedItems } from "@/lib/fundamentalsFormat";
import { roleLabel } from "@/lib/sinaxys";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import NotificationsPanel from "@/components/Notifications/NotificationsPanel";
import type { Role } from "@/lib/domain";
import { useTranslation } from "react-i18next";

// ... existing code ...
export function AppShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default AppShell;
