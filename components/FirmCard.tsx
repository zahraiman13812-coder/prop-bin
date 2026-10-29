import Link from "next/link";
import type { CSSProperties } from "react";

import type { Firm } from "@/lib/data";
import FirmLogo from "@/components/FirmLogo";

export default function FirmCard({ firm }: { firm: Firm }) {
  return (
    <article className="firm-card">
      <div className="firm-top">
        <FirmLogo
          firm={firm}
          className="firm-mark"
          style={
            {
              "--firm-color": firm.color,
            } as CSSProperties
          }
        />

        <div className="firm-name">
          <h3>{firm.name}</h3>
          <span className="rating">
            ★ {firm.rating} <small>از ۵</small>
          </span>
        </div>

        {firm.discount && (
          <span className="discount-pill">
            {firm.discount} تخفیف
          </span>
        )}
      </div>

      <p>{firm.description}</p>

      <div className="firm-stats">
        <div>
          <small>حداکثر سرمایه</small>
          <b>{firm.capital}</b>
        </div>
        <div>
          <small>سهم سود</small>
          <b>{firm.profit}</b>
        </div>
        <div>
          <small>هزینه شروع</small>
          <b>{firm.fee}</b>
        </div>
      </div>

      <div className="firm-actions">
        <Link
          className="button button-primary"
          href={`/firms#${firm.id}`}
        >
          جزئیات شرکت <span>←</span>
        </Link>
        <Link
          className="button button-quiet"
          href={`/discounts#${firm.id}`}
        >
          کد تخفیف
        </Link>
      </div>
    </article>
  );
}
