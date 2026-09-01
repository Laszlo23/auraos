// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Deploys creator collection + mint desk pairs on Robinhood Chain.
 */
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {AuraCreatorCollection} from "./AuraCreatorCollection.sol";
import {AuraCreatorMintDesk} from "./AuraCreatorMintDesk.sol";
import {CreatorMintAsset} from "./ICreator.sol";

contract AuraCollectionFactory is AccessControl, Pausable {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address public immutable STABLE;
    address public immutable PLATFORM;
    uint256 public immutable PLATFORM_BPS;

    struct CreateParams {
        string name;
        string symbol;
        string baseURI;
        uint256 maxSupply;
        uint256 price;
        CreatorMintAsset asset;
        address creator;
        address royaltyRecipient;
        uint96 royaltyBps;
        bytes32 slugHash;
    }

    event CollectionCreated(
        address indexed creator,
        address indexed collection,
        address indexed desk,
        bytes32 slugHash,
        string name,
        string symbol
    );

    error ZeroAddress();

    constructor(address stable_, address platform_, uint256 platformBps_, address admin_) {
        if (stable_ == address(0) || platform_ == address(0) || admin_ == address(0)) {
            revert ZeroAddress();
        }
        STABLE = stable_;
        PLATFORM = platform_;
        PLATFORM_BPS = platformBps_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(OPERATOR_ROLE, admin_);
    }

    function createCollection(CreateParams calldata p)
        external
        whenNotPaused
        onlyRole(OPERATOR_ROLE)
        returns (address collection, address desk)
    {
        if (p.creator == address(0) || p.maxSupply == 0) revert ZeroAddress();

        collection = address(
            new AuraCreatorCollection(
                p.name,
                p.symbol,
                p.baseURI,
                p.maxSupply,
                p.creator,
                p.royaltyRecipient,
                p.royaltyBps,
                address(0)
            )
        );

        desk = address(
            new AuraCreatorMintDesk(
                collection,
                STABLE,
                p.creator,
                PLATFORM,
                p.price,
                p.asset,
                PLATFORM_BPS
            )
        );

        AuraCreatorCollection(collection).setMintDesk(desk);

        emit CollectionCreated(p.creator, collection, desk, p.slugHash, p.name, p.symbol);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
