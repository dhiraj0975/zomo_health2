import pandas as pd
import numpy as np
import json
import sys
import os
from pandas.errors import ParserError

def csvToJson(csvFilePath, jsonFilePath, encoding='utf-8'):
    try:
        csvData = pd.read_csv(csvFilePath, encoding=encoding)
        csvData.replace(['NaN', 'nan', 'null', 'N/A', np.nan], '', inplace=True)
        csvDataRows = csvData.values.tolist()
        csvFinalData = [csvData.columns.tolist()] + csvDataRows
        jsonData = json.dumps(csvFinalData, ensure_ascii=False, separators=(',', ':'))
        with open(jsonFilePath, 'w', encoding=encoding) as jsonFile:
            jsonFile.write(jsonData)
        print("SUCCESS")
    except UnicodeDecodeError:
        print("INVALID_CSV_FILE")
        sys.exit(1)
    except ParserError as e:
        print("INVALID_CSV_DATA")
        sys.exit(1)
    except Exception as e:
        print("UNKNOWN_ERROR")
        sys.exit(1)

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print("ARG_MISSING_CSV_FILE")
            sys.exit(1)

        csvFilePath = sys.argv[1]

        if not os.path.exists(csvFilePath):
            print("CSV_FILE_NOT_FOUND")
            sys.exit(1)

        if not os.path.isfile(csvFilePath):
            print("INVALID_CSV_PATH")
            sys.exit(1)

        if not csvFilePath.lower().endswith('.csv'):
            print("INVALID_CSV_FILE")
            sys.exit(1)

        if not os.access(csvFilePath, os.R_OK):
            print("CSV_FILE_NOT_READABLE")
            sys.exit(1)

        csvFileName = os.path.splitext(os.path.basename(csvFilePath))[0]
        jsonFilePath = os.path.join(os.path.dirname(csvFilePath), csvFileName + ".json")
        csvToJson(csvFilePath, jsonFilePath, 'utf-8')
    except Exception as e:
        print("UNKNOWN_ERROR")
        sys.exit(1)
