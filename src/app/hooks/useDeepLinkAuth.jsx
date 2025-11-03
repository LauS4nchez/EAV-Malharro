"use client";
import { App } from "@capacitor/app";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function useDeepLinkAuth() {
  const router = useRouter();

  useEffect(() => {
    const listener = App.addListener("appUrlOpen", (event) => {
      const url = event.url;
      if (url.startsWith("myapp://auth")) {
        const token = new URL(url).searchParams.get("token");
        const email = new URL(url).searchParams.get("email");
        const provider = new URL(url).searchParams.get("provider") || "google";

        if (token) {
          localStorage.setItem("jwt", token);
          if (email) localStorage.setItem("email", email);
          localStorage.setItem("userRole", "Authenticated");
          router.push("/");
        }
      }
    });

    return () => {
      listener.remove();
    };
  }, []);
}
