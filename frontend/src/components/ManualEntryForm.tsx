import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Controller, useWatch, type Control } from 'react-hook-form';
import type { QuoteFormValues } from '../types';
import { AIRCRAFT_CATEGORIES, CURRENCIES, DEFAULT_TERMS_AND_CONDITIONS } from '../types';
import { cardSx, GOLD, SERIF } from '../theme';

interface CardProps {
  control: Control<QuoteFormValues>;
}

/** "Customer Information" card. */
export function CustomerCard({ control }: CardProps) {
  return (
    <SectionCard icon={<PersonOutlineIcon />} title="Customer Information">
      <Field control={control} name="customerName" label="Customer Name" span2 />
      <Field control={control} name="company" label="Company" />
      <Field control={control} name="phone" label="Phone" />
      <Field control={control} name="email" label="Email Address" type="email" span2 />
    </SectionCard>
  );
}

/** "Flight Details" card. */
export function FlightCard({ control }: CardProps) {
  return (
    <SectionCard icon={<FlightTakeoffIcon />} title="Flight Details">
      <Field control={control} name="departureAirport" label="Departure City / ICAO" placeholder="e.g. Delhi / VIDP" />
      <Field control={control} name="arrivalAirport" label="Arrival City / ICAO" placeholder="e.g. Mumbai / VABB" />
      <Field control={control} name="passengers" label="Passengers" type="number" min={1} />
      <Field control={control} name="departureDate" label="Travel Date" type="date" />
      <Controller
        control={control}
        name="aircraftCategory"
        render={({ field }) => (
          <LabeledInput label="Aircraft Category">
            <TextField {...field} select size="small" fullWidth>
              <MenuItem value="">
                <em>Any</em>
              </MenuItem>
              {AIRCRAFT_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </LabeledInput>
        )}
      />
      <Box />
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <LabeledInput label="Special Requirements">
              <TextField {...field} multiline minRows={2} placeholder="Catering, ground transport, lounge access..." fullWidth size="small" />
            </LabeledInput>
          </Box>
        )}
      />
    </SectionCard>
  );
}

/** "Pricing Configuration" card. */
export function PricingCard({ control }: CardProps) {
  const currency = useWatch({ control, name: 'currency' }) || 'USD';
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;

  return (
    <SectionCard icon={<AttachMoneyIcon />} title="Pricing Configuration">
      <Controller
        control={control}
        name="currency"
        render={({ field }) => (
          <LabeledInput label="Currency">
            <TextField {...field} select size="small" fullWidth>
              {CURRENCIES.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.symbol}&nbsp;&nbsp;{c.code} — {c.label}
                </MenuItem>
              ))}
            </TextField>
          </LabeledInput>
        )}
      />
      <Field control={control} name="flightHours" label="Flight Hours" type="number" min={0.5} step={0.5} />
      <Field control={control} name="landingCharges" label={`Landing Charges (${symbol})`} type="number" />
      <Field control={control} name="handlingCharges" label={`Handling Charges (${symbol})`} type="number" />
      <Field control={control} name="fuelCharges" label={`Fuel Surcharge (${symbol})`} type="number" />
      <Field control={control} name="parkingCharges" label={`Parking (${symbol})`} type="number" />
      <Field control={control} name="discount" label={`Discount (${symbol})`} type="number" />
      <Field control={control} name="hourlyRate" label={`Hourly Rate (${symbol})`} type="number" />
      <Field control={control} name="gstPercent" label="Taxes & Levies (%)" type="number" />
    </SectionCard>
  );
}

/** "Terms & Conditions" card — freeform, one term per line, printed as a numbered list in the PDF. */
export function TermsCard({ control }: CardProps) {
  return (
    <SectionCard icon={<GavelOutlinedIcon />} title="Terms & Conditions">
      <Controller
        control={control}
        name="termsAndConditions"
        render={({ field }) => (
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <LabeledInput label="One term per line — numbered automatically in the quotation">
              <TextField {...field} multiline minRows={5} fullWidth size="small" />
            </LabeledInput>
            <Button
              onClick={() => field.onChange(DEFAULT_TERMS_AND_CONDITIONS)}
              startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
              size="small"
              sx={{ mt: 1, color: 'text.secondary', fontSize: 12.5 }}
            >
              Reset to default terms
            </Button>
          </Box>
        )}
      />
    </SectionCard>
  );
}

/** White card with a serif heading and gold icon, fields in a 2-col grid. */
export function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Box sx={cardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.2 }}>
        <Box sx={{ color: GOLD, display: 'flex', '& svg': { fontSize: 21 } }}>{icon}</Box>
        <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: 'text.primary' }}>{title}</Typography>
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>{children}</Box>
    </Box>
  );
}

/** Grey label above the input, per the design. */
export function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 0.7 }}>{label}</Typography>
      {children}
    </Box>
  );
}

interface FieldProps {
  control: Control<QuoteFormValues>;
  name: keyof QuoteFormValues;
  label: string;
  type?: string;
  placeholder?: string;
  span2?: boolean;
  min?: number;
  step?: number;
}

function Field({ control, name, label, type = 'text', placeholder, span2, min, step }: FieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Box sx={span2 ? { gridColumn: { sm: '1 / -1' } } : undefined}>
          <LabeledInput label={label}>
            <TextField
              {...field}
              type={type}
              size="small"
              fullWidth
              placeholder={placeholder}
              slotProps={{ htmlInput: { min, step } }}
            />
          </LabeledInput>
        </Box>
      )}
    />
  );
}
