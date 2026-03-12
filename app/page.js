import Button from "@/components/ui/Button";

export default function Home() {
  return (
    <div>
      <Button variant="primary" size="md">
        Download
      </Button>
      <Button variant="secondary">Learn More</Button>
      <Button variant="ghost">Cancel</Button>
    </div>
  );
}
