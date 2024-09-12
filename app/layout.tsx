import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { customMetadataGenerator } from "@/lib/customMetadataGenerator";
import { Analytics } from "@vercel/analytics/react"
import { GoogleAnalytics } from "@next/third-parties/google"

const geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});
const geistMono = localFont({
    src: "./fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

export const metadata: Metadata = customMetadataGenerator({
    title: "Preview Rive",
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
                {children}
                <Analytics />
            </body>
            <GoogleAnalytics gaId="G-8MNPMG2HHQ" />
        </html>
    );
}
