import { PlantGuard } from "@/features/plant/components/PlantGuard";
import { PlantManagement } from "@/features/plant/components/PlantManagement";

export default function ManagePlantPage() {
  return (
    <PlantGuard>
      <PlantManagement />
    </PlantGuard>
  );
}
