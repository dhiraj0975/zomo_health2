import json
import os
import sys
import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import Border, Side

# Path to your JSON file
# data_path = "D:/Darshit/Darshit/Test/Test123.json"
data_path = sys.argv[1]
typeGet = 1
if len(sys.argv) > 3 : typeGet = sys.argv[2]
hideCells = []
if len(sys.argv) > 3 : hideCells = sys.argv[3].split(',')

# Path for the output Excel file
# excel_filename = "D:/Darshit/Darshit/Test/BB.xlsx"
# Extract file name without extension
file_name = os.path.splitext(os.path.basename(data_path))[0]
excel_filename = os.path.join(os.path.dirname(data_path), file_name + ".xlsx")

# Step 1: Read JSON data
with open(data_path, 'r', encoding='utf-8') as json_file : 
    data = json.load(json_file)
if typeGet == '2' : 
    # Step 2: Convert JSON Data to DataFrame
    df = pd.DataFrame(data)

    # Ensure the first row is set as the header
    df.columns = df.iloc[0]  # Set first row as column headers
    df = df[1:].reset_index(drop=True)  # Remove the first row from data

    # Step 3: Write DataFrame to Excel
    with pd.ExcelWriter(excel_filename, engine='openpyxl') as writer : df.to_excel(writer, sheet_name="Sheet", index=False)
else:
    # Step 2: Create a Pandas Excel writer object
    with pd.ExcelWriter(excel_filename, engine='openpyxl') as writer:
        # Convert the JSON data into a DataFrame
        df = pd.json_normalize(data)

        # Write the DataFrame to the Excel file in a single sheet
        df.to_excel(writer, sheet_name="Sheet", index=False)


wb = load_workbook(excel_filename)
ws = wb['Sheet']

# Define border style with no border
no_border_style = Border(
    left=Side(style=None),
    right=Side(style=None),
    top=Side(style=None),
    bottom=Side(style=None)
)

# Apply no borders to the headers in the first sheet (Sheet1)
for cell in ws[1]:  # ws[1] gets the first row (headers)
    cell.border = no_border_style

min_width = 10
for col in ws.columns:
    col_letter = col[0].column_letter  # Get column letter (e.g., A, B, C)
    
    if col_letter in hideCells:
        ws.column_dimensions[col_letter].hidden = True  # Hide column
    else:
        max_length = max((len(str(cell.value)) for cell in col if cell.value), default=0)
        ws.column_dimensions[col_letter].width = max(max_length + 5, min_width)

# Save the workbook with formatting applied
wb.save(excel_filename)

print(f'Excel file "{excel_filename}" with headers cleared of borders has been created.')
