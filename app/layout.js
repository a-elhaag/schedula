import { DM_Sans, DM_Serif_Display } from "next/font/google";
import AuthSignOutButton from "@/components/AuthSignOutButton";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata = {
  title: "Schedula - Schedule Management",
  description: "Schedule management system for institutions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <body>
        <AuthSignOutButton />
        {children}
      </body>
    </html>
  );
}
