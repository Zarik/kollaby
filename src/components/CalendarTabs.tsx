"use client";

import { useState } from "react";
import { startOfMonth } from "date-fns";
import { CITIES, SEASON } from "@/config/game";
import CityCalendar from "@/components/CityCalendar";
import DateAgenda from "@/components/DateAgenda";

type Tab = "cities" | "dates";

/** Переключатель видов календаря: «По городам» и «По датам». */
export default function CalendarTabs({ refreshKey }: { refreshKey: number }) {
  const [tab, setTab] = useState<Tab>("cities");
  const [city, setCity] = useState<string>(CITIES[0]);
  const [month, setMonth] = useState<Date>(startOfMonth(new Date(SEASON.start + "T00:00:00")));

  // Клик по городу в ленте: открыть «По городам» на этом городе И месяце даты.
  function pickCity(c: string, date: string) {
    setCity(c);
    setMonth(startOfMonth(new Date(date + "T00:00:00")));
    setTab("cities");
  }

  function tabBtn(t: Tab, label: string) {
    const active = tab === t;
    return (
      <button
        type="button"
        onClick={() => setTab(t)}
        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg bg-stone-100 p-1">
        {tabBtn("cities", "По городам")}
        {tabBtn("dates", "По датам")}
      </div>
      {tab === "cities" ? (
        <CityCalendar
          refreshKey={refreshKey}
          city={city}
          onCityChange={setCity}
          month={month}
          onMonthChange={setMonth}
        />
      ) : (
        <DateAgenda refreshKey={refreshKey} onPickCity={pickCity} />
      )}
    </div>
  );
}
