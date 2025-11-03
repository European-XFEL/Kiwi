import { Separator } from "@/components/ui/separator";
import Header from "../layouts/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const ErrorState = ({ error }: { error: string }) => (
  <div className="flex flex-col mx-auto p-2 w-full max-w-md sm:max-w-lg">
    <Header className="w-full max-w-[580px] mx-auto mt-1 mb-3 px-4">
      <div className="flex items-baseline justify-between">
        <div className="font-bold text-2xl tracking-tight">KIWI</div>
        <img
          src="xfel_logo_128.png"
          alt="XFEL Logo"
          className="h-10 w-auto md:h-12"
        />
      </div>

      <Separator className="mt-3" />
    </Header>
    <Card
      className="bg-destructive text-white shadow-lg border border-red-700/50"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <CardHeader className="flex flex-row items-center gap-2 sm:gap-3">
        <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />
        <CardTitle className="scroll-m-20 text-xl font-semibold tracking-tight">
          Application Error
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        <h3 className="scroll-m-20 text-xl sm:text-2xl font-semibold tracking-tight break-words">
          {error}
        </h3>
        <p className="leading-7 mt-2 text-white/90">
          Please wait a few seconds and refresh this page.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default ErrorState;
