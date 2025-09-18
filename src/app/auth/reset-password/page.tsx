"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PasswordResetModal } from "@/components/PasswordResetModal";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setEmail(user.email);
      } else {
        // If no user is found, redirect to login
        router.push("/");
      }
      setIsLoading(false);
    };

    checkSession();
  }, [router]);

  const handleClose = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PasswordResetModal
        isOpen={true}
        onClose={handleClose}
        userEmail={email}
        mode="change"
      />
    </div>
  );
}
