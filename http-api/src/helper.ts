export function parseArgs(args: string[]): { content: string; epochs?: number } {
	const result: { content: string; epochs?: number } = { content: args[0] }

	for (let i = 1; i < args.length; i++) {
		if (args[i] === '--epochs' && i + 1 < args.length) {
			const epochValue = parseInt(args[i + 1], 10)
			if (!isNaN(epochValue) && epochValue > 0) {
				result.epochs = epochValue
			} else {
				console.warn(`Warning: Invalid or missing number provided for --epochs. Using default behavior.`)
			}
			i++
		}
	}

	return result
}
