import Icon from "@/components/Icon";

export default function OfflinePage() {
  return (
    <div className="px-5 pt-20 pb-nav text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-azul-suave text-azul">
        <Icon name="alert" className="h-8 w-8" />
      </span>
      <h1 className="mt-4 text-xl font-extrabold">Sin conexión</h1>
      <p className="mt-2 text-muted">
        Esta página aún no está guardada. Puedes seguir reportando: se enviará al volver la señal.
      </p>
    </div>
  );
}
