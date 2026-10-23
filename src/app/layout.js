import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "SkinSense — Understand your skin",
  description: "An educational skin observation tool. Not a diagnosis.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<Toaster position="top-right" richColors closeButton /></body></html>;
}
