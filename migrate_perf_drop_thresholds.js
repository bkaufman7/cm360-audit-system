/**
 * MIGRATION SCRIPT: Migrate Performance Drop Thresholds Sheet to Include Column I
 * 
 * This function:
 * 1. Backs up current data to a new sheet with timestamp
 * 2. Logs all current values to console
 * 3. Reads all existing threshold data
 * 4. Deletes and recreates the sheet with correct structure (including Column I)
 * 5. Restores all data values with Column I defaulted to blank (disabled)
 * 
 * Run this once from the Apps Script editor to migrate your existing sheet.
 * After running, verify the data in the Performance Drop Thresholds sheet.
 */
function migratePerformanceDropThresholdsSheet() {
	const ui = SpreadsheetApp.getUi();
	
	try {
		Logger.log('=== STARTING PERFORMANCE DROP THRESHOLDS MIGRATION ===');
		const spreadsheet = getConfigSpreadsheet();
		const sheetName = PERFORMANCE_DROP_THRESHOLDS_SHEET_NAME;
		const sheet = spreadsheet.getSheetByName(sheetName);
		
		if (!sheet) {
			ui.alert('Migration Not Needed', 
				'The Performance Drop Thresholds sheet does not exist yet.\n\n' +
				'The sheet will be created with the correct structure when first accessed.',
				ui.ButtonSet.OK);
			Logger.log('Sheet does not exist - no migration needed');
			return;
		}
		
		// Confirm with user before proceeding
		const confirmResponse = ui.alert(
			'Migrate Performance Drop Thresholds Sheet?',
			'This will:\n\n' +
			'1. Create a backup copy of your current data\n' +
			'2. Recreate the sheet with Column I (Include Launch Attachment)\n' +
			'3. Restore all your existing values\n' +
			'4. Set Column I to blank (disabled) for existing configs\n\n' +
			'Do you want to proceed?',
			ui.ButtonSet.YES_NO
		);
		
		if (confirmResponse !== ui.Button.YES) {
			Logger.log('Migration cancelled by user');
			return;
		}
		
		// === STEP 1: BACKUP CURRENT DATA ===
		Logger.log('STEP 1: Creating backup...');
		const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
		const backupSheetName = `${sheetName}_BACKUP_${timestamp}`;
		const backupSheet = sheet.copyTo(spreadsheet);
		backupSheet.setName(backupSheetName);
		Logger.log(`✅ Backup created: ${backupSheetName}`);
		
		// === STEP 2: READ ALL CURRENT DATA ===
		Logger.log('STEP 2: Reading current data...');
		const allData = sheet.getDataRange().getValues();
		const headers = allData[0];
		Logger.log(`Current headers (${headers.length} columns): ${JSON.stringify(headers)}`);
		
		// Parse data rows (skip header)
		const dataRows = [];
		for (let i = 1; i < allData.length; i++) {
			const row = allData[i];
			const configName = String(row[0] || '').trim();
			
			// Skip empty rows and instruction/example rows
			if (!configName || 
				configName.includes('INSTRUCTIONS') || 
				configName.includes('Config Name:') || 
				configName.includes('Example')) {
				continue;
			}
			
			const rowData = {
				configName: configName,
				enablePerformanceDrop: String(row[1] || '').trim(),
				dropPercentageThreshold: row[2],
				minVolumeThreshold: row[3],
				gracePeriodDays: row[4],
				enableLaunchDetection: String(row[5] || '').trim(),
				launchWindowDays: row[6],
				launchMinVolume: row[7],
				// Column I doesn't exist yet in old structure
				includeLaunchAttachment: '', // Default to blank (disabled)
				active: String(row[8] || '').trim(), // Old column I becomes new column J
				lastUpdated: row[9] || '' // Old column J becomes new column K
			};
			
			dataRows.push(rowData);
			Logger.log(`  Row ${i}: ${configName} - Active: ${rowData.active}`);
		}
		
		Logger.log(`✅ Read ${dataRows.length} data rows`);
		
		// === STEP 3: DELETE OLD SHEET ===
		Logger.log('STEP 3: Deleting old sheet...');
		spreadsheet.deleteSheet(sheet);
		Logger.log('✅ Old sheet deleted');
		
		// === STEP 4: CREATE NEW SHEET WITH CORRECT STRUCTURE ===
		Logger.log('STEP 4: Creating new sheet with Column I...');
		const newSheet = getOrCreatePerformanceDropThresholdsSheet();
		Logger.log('✅ New sheet created with correct structure');
		
		// === STEP 5: RESTORE DATA ===
		Logger.log('STEP 5: Restoring data...');
		if (dataRows.length > 0) {
			// Prepare data for writing (convert objects to arrays)
			const restoreData = dataRows.map(row => [
				row.configName,
				row.enablePerformanceDrop,
				row.dropPercentageThreshold,
				row.minVolumeThreshold,
				row.gracePeriodDays,
				row.enableLaunchDetection,
				row.launchWindowDays,
				row.launchMinVolume,
				row.includeLaunchAttachment, // New Column I - defaults to blank
				row.active,
				row.lastUpdated,
				'' // INSTRUCTIONS column (empty for data rows)
			]);
			
			// Find first empty data row (after instructions)
			const newSheetData = newSheet.getDataRange().getValues();
			let writeStartRow = 2; // Start after header
			for (let i = 1; i < newSheetData.length; i++) {
				const configName = String(newSheetData[i][0] || '').trim();
				if (!configName || configName === 'Example Config') {
					writeStartRow = i + 1; // Write after this row
					break;
				}
			}
			
			// Write restored data
			newSheet.getRange(writeStartRow, 1, restoreData.length, 12).setValues(restoreData);
			Logger.log(`✅ Restored ${restoreData.length} config rows starting at row ${writeStartRow}`);
		}
		
		// === STEP 6: SUMMARY ===
		const summary = 
			`Migration Complete! ✅\n\n` +
			`• Backup created: ${backupSheetName}\n` +
			`• ${dataRows.length} configs migrated\n` +
			`• Column I (Include Launch Attachment) added\n` +
			`• All existing values preserved\n` +
			`• Column I set to blank (disabled) by default\n\n` +
			`Next steps:\n` +
			`1. Review the migrated data in Performance Drop Thresholds\n` +
			`2. Update Column I for configs that need launch attachments\n` +
			`3. Delete the backup sheet when satisfied\n\n` +
			`Check the Logs (View > Logs) for detailed migration info.`;
		
		Logger.log('=== MIGRATION COMPLETE ===');
		Logger.log(summary);
		
		ui.alert('Migration Successful!', summary, ui.ButtonSet.OK);
		
	} catch (error) {
		const errorMsg = `Migration failed: ${error.message}\n\nStack: ${error.stack}`;
		Logger.log(`❌ ERROR: ${errorMsg}`);
		ui.alert('Migration Error', errorMsg, ui.ButtonSet.OK);
		throw error;
	}
}
