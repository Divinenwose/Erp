import { NextResponse } from 'next/server';
import { City, State } from 'country-state-city';

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const countryCode = params.get('country') ?? '';
  const stateCode = params.get('state') ?? '';

  if (!/^[A-Z]{2}$/.test(countryCode) || !/^[A-Z0-9-]{1,10}$/.test(stateCode)) {
    return NextResponse.json({ error: 'Invalid country or state code' }, { status: 400 });
  }
  if (!State.getStateByCodeAndCountry(stateCode, countryCode)) return NextResponse.json([]);

  return NextResponse.json(City.getCitiesOfState(countryCode, stateCode).map(city => city.name));
}