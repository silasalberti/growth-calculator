import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { AiOutlineStock } from "react-icons/ai";
import { FaQuestionCircle } from "react-icons/fa";
import { IoMdTime } from "react-icons/io";
import { IoFlashOutline } from "react-icons/io5";
import logo from "./fulfin-logo.png";

function formatNumber(number) {
  if (Math.abs(number) > 1000000000) {
    return "$" + (number / 1000000000).toString() + "B";
  } else if (Math.abs(number) > 1000000) {
    return "$" + (Math.abs(number) / 1000000).toString() + "M";
  } else if (Math.abs(number) > 1000) {
    return "$" + (number / 1000).toString() + "K";
  } else {
    return "$" + number.toString();
  }
}

function Scale(props) {
  return (
    <div className="w-full flex justify-between text-xs px-2">
      <span>{props.lower}</span>
      <span>|</span>
      <span>|</span>
      <span>|</span>
      <span>{props.upper}</span>
    </div>
  );
}

function Table(props) {
  return (
    <div className="overflow-x-auto card shadow">
      <table className="table">
        <thead>
          <tr>
            <th>Days</th>
            <th>Capital</th>
            <th>Debt</th>
            <th>Revenue</th>
            <th>Profit</th>
            <th>Fee</th>
            <th>New Capital</th>
          </tr>
        </thead>
        <tbody>
          {props.table?.map((row) => (
            <tr key={row.days}>
              <th>{row.days}</th>
              <td>${parseInt(row.capital).toLocaleString()}</td>
              <td>${parseInt(row.debt).toLocaleString()}</td>
              <td>${parseInt(row.revenue).toLocaleString()}</td>
              <td>${parseInt(row.profit).toLocaleString()}</td>
              <td>${parseInt(row.feeAmount).toLocaleString()}</td>
              <td>${parseInt(row.newCapital).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function calculation(
  withLeverage,
  initialCapital,
  targetMultiple,
  debtPercentage,
  profitMargin,
  salesToPurchasePriceRatio,
  fee,
  withdrawalsPerMonth,
  cashConversionCycle
) {
  //// Calculation with leverage
  // Helper functions for all relevant metrics
  const leverage = 1 / (1 - debtPercentage);
  const debt = (capital) => (withLeverage ? (leverage - 1) * capital : 0); // Always zero if ` withLeverage` is false
  const investment = (capital) => debt(capital) + capital;
  const feeAmount = (capital) => fee * debt(capital);
  const revenue = (capital) => salesToPurchasePriceRatio * investment(capital);
  const profit = (capital) =>
    profitMargin * revenue(capital) - feeAmount(capital);
  const withdrawalsPerCycle = (withdrawalsPerMonth * cashConversionCycle) / 30;

  let table = [];

  let capital = initialCapital;
  const initialRevenue = revenue(capital);
  let cycles = 0;
  while (revenue(capital) / initialRevenue < targetMultiple) {
    if (profit(capital) <= withdrawalsPerCycle) {
      return {
        profitable: false,
        lossPerCycle: profit(capital) - withdrawalsPerCycle,
      };
    }
    cycles++;
    table.push({
      days: cashConversionCycle * cycles,
      capital,
      debt: debt(capital),
      revenue: revenue(capital),
      profit: profit(capital),
      feeAmount: feeAmount(capital),
      newCapital: capital + profit(capital) - withdrawalsPerCycle,
    });
    capital += profit(capital) - withdrawalsPerCycle;
  }
  // A final iteration of the loop body
  cycles++;
  table.push({
    days: cashConversionCycle * cycles,
    capital,
    debt: debt(capital),
    revenue: revenue(capital),
    profit: profit(capital),
    feeAmount: feeAmount(capital),
    newCapital: capital + profit(capital) - withdrawalsPerCycle,
  });

  return {
    profitable: true,
    table,
    initialRevenue,
    daysToTargetMultiple: cashConversionCycle * cycles,
  };
}

function App(props) {
  const [initialCapital, setInitialCapital] = React.useState(10000);
  const [targetMultiple, setTargetMultiple] = React.useState(10);
  const [debtPercentage, setDebtPercentage] = React.useState(0.75); // % of project financed with debt
  const [profitMargin, setProfitMargin] = React.useState(0.2);
  const [salesToPurchasePriceRatio, setSalesToPurchasePriceRatio] =
    React.useState(3); // Sp/Pp - Ratio of sales price to purchase price
  const [fee, setFee] = React.useState(0.05); // Cost of debt as percent of nominal
  const [cashConversionCycle, setCashConversionCycle] = React.useState(150);
  const [withdrawalsPerMonth, setWithdrawalsPerMonth] = React.useState(1000);

  const calculationWithLeverage = calculation(
    true,
    initialCapital,
    targetMultiple,
    debtPercentage,
    profitMargin,
    salesToPurchasePriceRatio,
    fee,
    withdrawalsPerMonth,
    cashConversionCycle
  );
  const calculationWithoutLeverage = calculation(
    false,
    initialCapital,
    targetMultiple,
    debtPercentage,
    profitMargin,
    salesToPurchasePriceRatio,
    fee,
    withdrawalsPerMonth,
    cashConversionCycle
  );

  let chartData = [];

  if (
    calculationWithLeverage.profitable &&
    calculationWithoutLeverage.profitable
  ) {
    chartData = [
      {
        x: 0,
        yWithout: 0,
        yWith: 0,
      },
      ...calculationWithoutLeverage.table.map((row, idx) => ({
        x: row.days,
        yWithout: row.revenue,
        yWith: calculationWithLeverage.table[idx]?.revenue,
      })),
    ];
  } else if (calculationWithLeverage.profitable) {
    const cycles = calculationWithLeverage.table.length * 2;
    chartData = Array.from({ length: cycles }, (_, idx) => ({
      x: idx,
      yWith: idx > 0 ? calculationWithLeverage.table[idx - 1]?.revenue : 0,
      yWithout: calculationWithoutLeverage.lossPerCycle * idx,
    }));
  }

  return (
    <div className="w-full bg-base-200">
      <div className="container mx-auto p-4 sm:py-8 sm:px-0">
        <div className="card bg-base-100 shadow-2xl">
          <div className="card body py-7 px-6 sm:px-10">
            <div className="grid grid-cols-4 lg:grid-cols-5 gap-6">
              <div className="col-span-4 lg:col-span-5 flex items-center">
                <img
                  src={logo}
                  alt="Fulfin Logo"
                  className="h-9 sm:h-10 mr-4"
                />
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral">
                  Growth Calculator
                </h1>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <div className="card bg-neutral shadow-lg p-4 flex flex-row items-center my-2">
                  <AiOutlineStock className="text-white w-[4.3rem] h-[4.3rem] mr-2" />
                  <h3 className="text-xl text-white text-center">
                    Achieve your target revenue
                    <span className="font-bold">
                      {!calculationWithLeverage.profitable
                        ? " –"
                        : !calculationWithoutLeverage.profitable
                        ? " ∞"
                        : " " +
                          Math.round(
                            (calculationWithoutLeverage.daysToTargetMultiple /
                              calculationWithLeverage.daysToTargetMultiple) *
                              10
                          ) /
                            10}
                      x
                    </span>{" "}
                    faster by using{" "}
                    <span className="font-bold">
                      {Math.round(debtPercentage * 100)}%
                    </span>{" "}
                    of debt financing!
                  </h3>
                </div>
                <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full mt-2">
                  <div className="stat">
                    <div className="stat-figure text-primary block lg:hidden xl:block">
                      <IoFlashOutline className="w-8 h-8" />
                    </div>
                    <div className="stat-title">With Financing</div>
                    <div className="stat-value text-primary">
                      {!calculationWithLeverage.profitable
                        ? "–"
                        : calculationWithLeverage.daysToTargetMultiple}
                      d
                    </div>
                    <div className="stat-desc">
                      to {targetMultiple}x of initial revenue
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-figure text-neutral block lg:hidden xl:block">
                      <IoMdTime className="w-8 h-8" />
                    </div>
                    <div className="stat-title">Without Financing</div>
                    <div className="stat-value text-neutral">
                      {!calculationWithoutLeverage.profitable
                        ? "–"
                        : calculationWithoutLeverage.daysToTargetMultiple}
                      d
                    </div>
                    <div className="stat-desc">
                      to {targetMultiple}x of initial revenue
                    </div>
                  </div>
                </div>
                <div className="card bg-neutral shadow-lg mt-4 pr-3 pl-1 pt-7 pb-3 md:p-8 md:pl-4 md:pb-5">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="colorWith"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#2d65c2"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#2d65c2"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorWithout"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#e3e3e3"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#e3e3e3"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="x"
                        minTickGap={30}
                        tickFormatter={(tick) => `${tick} days`}
                        tick={{ fill: "white", fontSize: "14" }}
                      />
                      <YAxis
                        tickFormatter={formatNumber}
                        tick={{ fill: "white", fontSize: "14" }}
                      />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Area
                        type="monotone"
                        dataKey="yWithout"
                        stroke="#ffffff"
                        fillOpacity={1}
                        fill="url(#colorWithout)"
                      />
                      <Area
                        type="monotone"
                        dataKey="yWith"
                        stroke="#3880f5"
                        fillOpacity={1}
                        fill="url(#colorWith)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2 lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                <div>
                  <div className="w-full flex items-end">
                    <h2 className="text-md xl:text-lg mb-2 font-bold pr-2">
                      ${parseInt(initialCapital).toLocaleString()}
                    </h2>
                    <h2 className="text-md xl:text-lg mb-2">Initial Capital</h2>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="250"
                    value={initialCapital}
                    onChange={(e) =>
                      setInitialCapital(parseInt(e.target.value))
                    }
                    className="range"
                  />
                  <Scale lower="$1,000" upper="$100,000" />
                </div>
                <div>
                  <div className="w-full flex items-end">
                    <h2 className="text-md xl:text-lg mb-2 font-bold pr-2">
                      {targetMultiple}x
                    </h2>
                    <h2 className="text-md xl:text-lg mb-2">
                      Target Revenue Multiple
                    </h2>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={targetMultiple}
                    onChange={(e) =>
                      setTargetMultiple(parseInt(e.target.value))
                    }
                    className="range"
                  />
                  <Scale lower="1x" upper="20x" />
                </div>
                <div>
                  <div className="w-full flex items-end">
                    <h2 className="text-md xl:text-lg mb-2 font-bold pr-2">
                      {Math.round(debtPercentage * 100)}%
                    </h2>
                    <h2 className="text-md xl:text-lg mb-2">
                      of Project Financed with Debt
                    </h2>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.99"
                    step="0.01"
                    value={debtPercentage}
                    onChange={(e) =>
                      setDebtPercentage(parseFloat(e.target.value))
                    }
                    className="range "
                  />
                  <Scale lower="0%" upper="99%" />
                </div>
                <div>
                  <div className="w-full flex items-end">
                    <h2 className="text-md xl:text-lg mb-2 font-bold pr-2">
                      {Math.round(profitMargin * 100)}%
                    </h2>
                    <h2 className="text-md xl:text-lg mb-2">Profit Margin</h2>
                    <div
                      className="tooltip"
                      data-tip="Profit made on sales revenue, which can be invested into the next project"
                    >
                      <h2 className="text-lg text-neutral mb-[0.75rem] xl:mb-[0.8rem] ml-4">
                        <FaQuestionCircle />
                      </h2>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={profitMargin}
                    onChange={(e) =>
                      setProfitMargin(parseFloat(e.target.value))
                    }
                    className="range "
                  />
                  <Scale lower="0%" upper="50%" />
                </div>
                <div>
                  <div className="w-full flex items-end">
                    <h2 className="text-md xl:text-lg mb-2 font-bold pr-2">
                      {salesToPurchasePriceRatio}:1
                    </h2>
                    <h2 className="text-md xl:text-lg mb-2">
                      Sales : Purchase Price Ratio
                    </h2>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="10"
                    step="0.1"
                    value={salesToPurchasePriceRatio}
                    onChange={(e) =>
                      setSalesToPurchasePriceRatio(parseFloat(e.target.value))
                    }
                    className="range "
                  />
                  <Scale lower="1.5:1" upper="10:1" />
                </div>
                <div>
                  <div className="w-full flex items-end">
                    <h2 className="text-md xl:text-lg mb-2 font-bold pr-2">
                      {Math.round(fee * 1000) / 10}%
                    </h2>
                    <h2 className="text-md xl:text-lg mb-2">Fee</h2>
                    <div
                      className="tooltip"
                      data-tip="Cost of debt as percentage of nominal"
                    >
                      <h2 className="text-lg text-neutral mb-[0.75rem] xl:mb-[0.8rem] ml-4">
                        <FaQuestionCircle />
                      </h2>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.001"
                    value={fee}
                    onChange={(e) => setFee(parseFloat(e.target.value))}
                    className="range "
                  />
                  <Scale lower="0%" upper="20%" />
                </div>
                <div>
                  <div className="w-full flex items-end">
                    <h2 className="text-md xl:text-lg mb-2 font-bold pr-2">
                      {cashConversionCycle} Days
                    </h2>
                    <h2 className="text-md xl:text-lg mb-2">
                      Cash Conversion Cycle
                    </h2>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="360"
                    step="10"
                    value={cashConversionCycle}
                    onChange={(e) =>
                      setCashConversionCycle(parseInt(e.target.value))
                    }
                    className="range "
                  />
                  <Scale lower="30 days" upper="360 days" />
                </div>
                <div>
                  <div className="w-full flex items-end">
                    <h2 className="text-md xl:text-lg mb-2 font-bold pr-2">
                      ${withdrawalsPerMonth}
                    </h2>
                    <h2 className="text-md xl:text-lg mb-2">
                      Withdrawals per Month
                    </h2>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="50"
                    value={withdrawalsPerMonth}
                    onChange={(e) =>
                      setWithdrawalsPerMonth(parseInt(e.target.value))
                    }
                    className="range "
                  />
                  <Scale lower="$0" upper="$10,000" />
                </div>
              </div>
            </div>
            <div className="grid my-10 gap-6 grid-cols-1 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-medium text-neutral mb-3">
                  With Financing
                </h2>
                {!calculationWithLeverage.profitable ? (
                  <div className="alert alert-warning shadow-lg">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="stroke-current flex-shrink-0 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        Project is unprofitable! Try increasing margin or
                        lowering withdrawals.
                      </span>
                    </div>
                  </div>
                ) : (
                  <Table table={calculationWithLeverage.table} />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-medium mb-3 text-neutral">
                  Without Financing
                </h2>
                {!calculationWithoutLeverage.profitable ? (
                  <div className="alert alert-warning shadow-lg">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="stroke-current flex-shrink-0 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        Project is unprofitable! Try increasing margin or
                        lowering withdrawals.
                      </span>
                    </div>
                  </div>
                ) : (
                  <Table table={calculationWithoutLeverage.table} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;
