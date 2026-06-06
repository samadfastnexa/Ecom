import { PlantGuard } from "@/features/plant/components/PlantGuard";
import { PlantManagement } from "@/features/plant/components/PlantManagement";

export default function PlantPage() {
  return (
    <PlantGuard>
      <PlantManagement />
    </PlantGuard>
  );
}
