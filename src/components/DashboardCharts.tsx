'use client';
import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

export const SalesAreaChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
      <defs>
        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
      <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} fontWeight="bold" tickLine={false} />
      <YAxis stroke="#94A3B8" fontSize={9} fontWeight="bold" tickLine={false} />
      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
      <Area type="monotone" dataKey="Sales" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
    </AreaChart>
  </ResponsiveContainer>
);

export const PaymentPieChart = ({ data, colors }: { data: any[], colors: string[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={80}
        paddingAngle={4}
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value: any) => `${value}%`} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
    </PieChart>
  </ResponsiveContainer>
);

export const ExpenseBarChart = ({ data, colors }: { data: any[], colors: string[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
      <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} fontWeight="bold" tickLine={false} />
      <YAxis stroke="#94A3B8" fontSize={9} fontWeight="bold" tickLine={false} />
      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
      <Bar dataKey="Amount" fill="#6366F1" radius={[8, 8, 0, 0]}>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
