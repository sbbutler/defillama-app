import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import dynamic from 'next/dynamic'
import { BRIDGES_SHOWING_TXS, useBridgesManager } from '~/contexts/LocalStorage'
import {
	BreakpointPanel,
	BreakpointPanels,
	ChartAndValuesWrapper,
	PanelHiddenMobile
} from '~/components'
import { Header } from '~/Theme'
import { PeggedChainResponsivePie } from '~/components/Charts'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { BridgesSearchWithBreakdown } from '../Search/Bridges'
import { ChartSelector } from '~/components/PeggedPage/.'
import { BridgesTable } from '~/components/Table'
import { LargeTxsTable } from './LargeTxsTable'
import { TxsTableSwitch } from '../BridgesPage/TableSwitch'
import { useBuildBridgeChartData } from '~/utils/bridges'
import { useXl, useMed } from '~/hooks/useBreakpoints'
import {
	getRandomColor,
	formattedNum,
	getPercentChange,
	getPrevVolumeFromChart
} from '~/utils'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

const HeaderWrapper = styled(Header)`
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	border: 1px solid transparent;
`

function BridgesOverview({
	selectedChain = 'All',
	chains = [],
	filteredBridges,
	bridgeNames,
	bridgeNameToChartDataIndex,
	chartDataByBridge,
	chainVolumeData,
	bridgeStatsCurrentDay,
	largeTxsData
}) {
	const [enableBreakdownChart, setEnableBreakdownChart] = React.useState(false)
	const [chartType, setChartType] = useState('Volumes')

	const chartTypeList = selectedChain !== 'All' ? ['Volumes', 'Tokens Bridged To', 'Tokens Bridged From'] : ['Volumes']

	const belowMed = useMed()
	const belowXl = useXl()
	const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

	const [bridgesSettings] = useBridgesManager()
	const isBridgesShowingTxs = bridgesSettings[BRIDGES_SHOWING_TXS]

	const handleRouting = (selectedChain) => {
		if (selectedChain === 'All') return `/bridges`
		return `/bridges/${selectedChain}`
	}
	const chainOptions = ['All', ...chains].map((label) => ({ label, to: handleRouting(label) }))

	const chartData = React.useMemo(() => {
		if (enableBreakdownChart) {
			let unformattedChartData = {}
			bridgeNames.map((name) => {
				const chartDataIndex = bridgeNameToChartDataIndex[name]
				const charts = chartDataByBridge[chartDataIndex]
				charts.map((chart) => {
					const date = chart.date
					const volume = chart.volume
					unformattedChartData[date] = unformattedChartData[date] || {}
					unformattedChartData[date][name] = volume
				})
			})
			const chartDates = Object.keys(unformattedChartData)
			return bridgeNames
				.map((name) => {
					return {
						name: name,
						data: chartDates.map((date) => [new Date(parseInt(date) * 1000), unformattedChartData[date][name] ?? 0])
					}
				})
				.filter((chart) => chart.data.length !== 0)
		} else return chainVolumeData.map((chart) => [new Date(chart.date * 1000), chart.volume])
	}, [bridgeNames, bridgeNameToChartDataIndex, chartDataByBridge, chainVolumeData, enableBreakdownChart])

	const { tokenDeposits, tokenWithdrawals } = useBuildBridgeChartData(bridgeStatsCurrentDay)

	const tokenColor = useMemo(
		() =>
			Object.fromEntries(
				[...tokenDeposits, ...tokenWithdrawals, 'Others'].map((token) => {
					return typeof token === 'string' ? ['-', getRandomColor()] : [token.name, getRandomColor()]
				})
			),
		[tokenDeposits, tokenWithdrawals]
	)

	/*
	const downloadCsv = () => {
		const filteredPeggedNames = peggedAssetNames.filter((name, i) => filteredIndexes.includes(i))
		const rows = [['Timestamp', 'Date', ...filteredPeggedNames, 'Total']]
		stackedData
			.sort((a, b) => a.date - b.date)
			.forEach((day) => {
				rows.push([
					day.date,
					toNiceCsvDate(day.date),
					...filteredPeggedNames.map((peggedAsset) => day[peggedAsset] ?? ''),
					filteredPeggedNames.reduce((acc, curr) => {
						return (acc += day[curr] ?? 0)
					}, 0)
				])
			})
		download('stablecoins.csv', rows.map((r) => r.join(',')).join('\n'))
	}
	*/

	const { dayPercentChange, monthPercentChange, totalVolumeCurrent } = useMemo(() => {
		let totalVolumeCurrent = getPrevVolumeFromChart(chainVolumeData, 0)
		let totalVolumePrevDay = getPrevVolumeFromChart(chainVolumeData, 1)
		let totalVolumePrevMonth = getPrevVolumeFromChart(chainVolumeData, 30)
		const dayPercentChange = getPercentChange(totalVolumeCurrent, totalVolumePrevDay)?.toFixed(2)
		const monthPercentChange = getPercentChange(totalVolumeCurrent, totalVolumePrevMonth)?.toFixed(2)
		return { dayPercentChange, monthPercentChange, totalVolumeCurrent }
	}, [chainVolumeData])

	return (
		<>
			<BridgesSearchWithBreakdown
				step={{
					category: 'Bridges',
					name: selectedChain
				}}
				onToggleClick={(enabled) => setEnableBreakdownChart(enabled)}
			/>

			<HeaderWrapper>
				<span>Volume in {selectedChain === 'All' ? 'all bridges' : selectedChain}</span>
			</HeaderWrapper>

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total 24h volume (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>
							{formattedNum(totalVolumeCurrent, true)}
						</p>
					</BreakpointPanel>
					<PanelHiddenMobile>
						<h2>Change (24h)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}> {dayPercentChange || 0}%</p>
					</PanelHiddenMobile>
					<PanelHiddenMobile>
						<h2>Change (30d)</h2>
						<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}> {monthPercentChange || 0}%</p>
					</PanelHiddenMobile>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper" style={{ gap: '16px', minHeight: '450px', justifyContent: 'space-between' }}>
					<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
					{chartType === 'Volumes' && chartData && chartData.length > 0 && (
						<StackedBarChart
							chartData={
								enableBreakdownChart
									? (chartData as IStackedBarChartProps['chartData'])
									: [
											{
												name: selectedChain,
												data: chartData as IStackedBarChartProps['chartData'][0]['data']
											}
									  ]
							}
						/>
					)}
					{chartType === 'Tokens Bridged To' && (
						<PeggedChainResponsivePie data={tokenWithdrawals} chainColor={tokenColor} aspect={aspect} />
					)}
					{chartType === 'Tokens Bridged From' && (
						<PeggedChainResponsivePie data={tokenDeposits} chainColor={tokenColor} aspect={aspect} />
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<TxsTableSwitch />

			{isBridgesShowingTxs && <LargeTxsTable data={largeTxsData} />}
			{!isBridgesShowingTxs && (
				<>
					<RowLinksWrapper>
						<RowLinksWithDropdown links={chainOptions} activeLink={selectedChain} />
					</RowLinksWrapper>

					<BridgesTable data={filteredBridges} />
				</>
			)}
		</>
	)
}

export default BridgesOverview
