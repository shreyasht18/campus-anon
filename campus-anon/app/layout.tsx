import type { Metadata } from "next";
import "./globals.css";
import NavBar from "../components/NavBar";

export const metadata: Metadata = {
  title: "Campus Anon",
  description: "Anonymous confessions, questions and chats for your campus.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 font-sans text-gray-100 antialiased">
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
