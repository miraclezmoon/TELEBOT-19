import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import Coins from "@/pages/coins";
import Raffles from "@/pages/raffles";
import Shop from "@/pages/shop";
import Referrals from "@/pages/referrals";
import Logs from "@/pages/logs";
import Settings from "@/pages/settings";
import Themes from "@/pages/themes";
import AdminLayout from "@/components/layout/admin-layout";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <AdminLayout><Dashboard /></AdminLayout>} />
      <Route path="/dashboard" component={() => <Redirect to="/" />} />
      <Route path="/users" component={() => <AdminLayout><Users /></AdminLayout>} />
      <Route path="/coins" component={() => <AdminLayout><Coins /></AdminLayout>} />
      <Route path="/raffles" component={() => <AdminLayout><Raffles /></AdminLayout>} />
      <Route path="/shop" component={() => <AdminLayout><Shop /></AdminLayout>} />
      <Route path="/referrals" component={() => <AdminLayout><Referrals /></AdminLayout>} />
      <Route path="/themes" component={() => <AdminLayout><Themes /></AdminLayout>} />
      <Route path="/logs" component={() => <AdminLayout><Logs /></AdminLayout>} />
      <Route path="/settings" component={() => <AdminLayout><Settings /></AdminLayout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="admin-panel-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
