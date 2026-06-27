import EditSpotClient from "./edit-client";

export default async function EditSpotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditSpotClient spotId={id} />;
}
