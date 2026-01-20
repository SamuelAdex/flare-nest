"use client";

import Link from "next/link";
import { Box, Wallet, Circle, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn, serializeAddress } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function Navbar() {
    const { address } = useApp();
    const pathname = usePathname();

    // Only show wallet stuff on /dashboard and /batches
    const isAdmin = pathname.startsWith("/dashboard") || pathname.startsWith("/batches");

    return (
        <nav className="sticky top-0 z-50 w-full glass border-b border-border">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-brand flex items-center justify-center rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                        <Box className="text-white w-5 h-5" />
                    </div>
                    <span className="text-lg font-bold text-primary">FlareNest</span>
                </Link>

                {/* Action Items */}
                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <>
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
                                <Circle className="w-2 h-2 fill-current" />
                                Flare Network
                            </div>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border">
                                <Wallet className="w-4 h-4 text-secondary" />
                                <span className="text-sm font-mono text-primary">{serializeAddress(address!)}</span>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center border border-brand/30">
                                <User className="w-5 h-5 text-brand" />
                            </div>
                        </>
                    )}
                    {!isAdmin && pathname === "/recipient" && (
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border">
                            <Wallet className="w-4 h-4 text-secondary" />
                            <span className="text-sm font-mono text-primary">{serializeAddress(address!)}</span>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
