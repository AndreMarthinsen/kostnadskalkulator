import {createSlice, PayloadAction} from "@reduxjs/toolkit";

export interface FormulaInfoState {
    name: string;
    version: {major: number, minor: number, patch: number};
    dateCreated: number;
}

export const formulaInfoSlice = createSlice(
    {
        name: 'formulaInfo',
        initialState: {
            name: "",
            version: {major: 0, minor: 0, patch: 0},
            dateCreated: 0,
        } as FormulaInfoState,
        reducers: {
            setName: (state, action: PayloadAction<string>) => {
                state.name = action.payload;
            },
            increaseMajorVersion: (state, action) => {
                state.version.major++;
            },
            increaseMinorVersion: (state, action) => {
                state.version.minor++;
            },
            increasePatchVersion: (state, action) => {
                state.version.patch++;
            },
            setDateCreated: (state, action) => {
                const date = new Date();
                state.dateCreated = date.getTime()
            }
        }
    }
)

export const {setName, increaseMajorVersion, increaseMinorVersion, increasePatchVersion, setDateCreated} = formulaInfoSlice.actions;

export const formulaInfoReducer = formulaInfoSlice.reducer;