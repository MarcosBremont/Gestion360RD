import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "./Icon";

export default function PageHeader({
  title,
  back,
  action,
}: {
  title: string;
  back?: string;
  action?: ReactNode;
}) {
  const circle = "glass flex h-11 w-11 items-center justify-center rounded-full!";
  return (
    <header className="flex items-center justify-between pb-4">
      {back ? (
        <Link href={back} aria-label="Volver" className={circle}>
          <Icon name="back" className="h-5 w-5" />
        </Link>
      ) : (
        <span className="h-11 w-11" />
      )}
      <h1 className="text-lg font-bold">{title}</h1>
      {action ?? <span className="h-11 w-11" />}
    </header>
  );
}
