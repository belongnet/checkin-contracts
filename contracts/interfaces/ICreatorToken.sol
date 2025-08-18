// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @title ICreatorToken Interface
/// @notice Interface for managing transfer validators for tokens
/// @dev This interface allows getting and setting transfer validators and their corresponding validation functions
interface ICreatorToken {
    /// @notice Emitted when the transfer validator is updated
    /// @param oldValidator The old transfer validator address
    /// @param newValidator The new transfer validator address
    event TransferValidatorUpdated(address oldValidator, address newValidator);

    /// @notice Retrieves the current transfer validator contract address
    /// @return validator The address of the current transfer validator
    function getTransferValidator() external view returns (address validator);

    /// @notice Retrieves the function signature of the transfer validation function and whether it's a view function
    /// @return functionSignature The function signature of the transfer validation function
    /// @return isViewFunction Indicates whether the transfer validation function is a view function
    function getTransferValidationFunction() external view returns (bytes4 functionSignature, bool isViewFunction);

    /// @notice Sets a new transfer validator contract
    /// @param validator The address of the new transfer validator
    function setTransferValidator(address validator) external;
}

/// @title ILegacyCreatorToken Interface
/// @notice Legacy interface for managing transfer validators for tokens
/// @dev This is a simplified version of the `ICreatorToken` interface
interface ILegacyCreatorToken {
    /// @notice Emitted when the transfer validator is updated
    /// @param oldValidator The old transfer validator address
    /// @param newValidator The new transfer validator address
    event TransferValidatorUpdated(address oldValidator, address newValidator);

    /// @notice Retrieves the current transfer validator contract address
    /// @return validator The address of the current transfer validator
    function getTransferValidator() external view returns (address validator);

    /// @notice Sets a new transfer validator contract
    /// @param validator The address of the new transfer validator
    function setTransferValidator(address validator) external;
}
