import { PageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-md px-4">
      <PageSkeleton />
    </div>
  );
}
