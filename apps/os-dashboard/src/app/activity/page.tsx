import { Card } from "@/components/card";

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-zinc-500">
          Recent jobs, validations and rewards (mock).
        </p>
      </header>
      <Card>
        <div className="text-sm text-zinc-500">
          Live activity feed will appear here once a worker is connected.
        </div>
      </Card>
    </div>
  );
}
