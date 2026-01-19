import pandas as pd
import numpy as np
import json
import sys
import os
from datetime import datetime

def date_converter(o):
    try:
        if pd.isna(o):
            return str("")
        if isinstance(o, (datetime, pd.Timestamp)):
            return o.strftime("%m-%d-%Y")
        else:
            return str("")
    except Exception as e:
        print("INVALID_DATE_ERROR")
        sys.exit(1)

def xlsxToJson(xlsxFilePath, jsonFilePath):
    try:
        excel_file = pd.read_excel(xlsxFilePath, sheet_name=None, header=None)
        if len(excel_file.items()) != 1:
            print("MULTIPLE_SHEETS_IN_XLSX_FILE")
            sys.exit(1)
        xlsxData = pd.read_excel(xlsxFilePath)
        xlsxData.replace(['NaN', 'nan', 'null', 'N/A', np.nan], '', inplace=True)
        xlsxHeaderData = xlsxData.columns.tolist()
        xlsxValuesData = xlsxData.values.tolist()
        xlsxFinalData = [xlsxHeaderData] + xlsxValuesData
        jsonData = json.dumps(xlsxFinalData, default=date_converter, ensure_ascii=False, separators=(',', ':'))
        with open(jsonFilePath, 'w', encoding='utf-8') as jsonFile:
            jsonFile.write(jsonData)
        print("SUCCESS")
    except UnicodeDecodeError:
        print("INVALID_XLSX_FILE")
        sys.exit(1)
    except Exception as e:
        print("UNKNOWN_ERROR")
        sys.exit(1)

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print("ARG_MISSING_XLSX_FILE")
            sys.exit(1)

        xlsxFilePath = sys.argv[1]

        if not os.path.exists(xlsxFilePath):
            print("XLSX_FILE_NOT_FOUND")
            sys.exit(1)

        if not os.path.isfile(xlsxFilePath):
            print("INVALID_XLSX_PATH")
            sys.exit(1)

        if not xlsxFilePath.lower().endswith('.xlsx') and not xlsxFilePath.lower().endswith('.xls'):
            print("INVALID_XLSX_FILE")
            sys.exit(1)

        if not os.access(xlsxFilePath, os.R_OK):
            print("XLSX_FILE_NOT_READABLE")
            sys.exit(1)

        xlsxFileName = os.path.splitext(os.path.basename(xlsxFilePath))[0]
        jsonFilePath = os.path.join(os.path.dirname(xlsxFilePath), xlsxFileName + ".json")
        xlsxToJson(xlsxFilePath, jsonFilePath)
    except Exception as e:
        print("UNKNOWN_ERROR")
        sys.exit(1)
